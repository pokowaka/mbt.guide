// @flow

import * as db from 'services/db';
import * as errors from 'errors';
import * as luxon from 'luxon';
import * as utils from 'utils';
import invariant from 'invariant';
import { v4 as uuid } from 'uuid';

const YOUTUBE_API_KEY = 'AIzaSyBTOgZacvh2HpWGO-8Fbd7dUOvMJvf-l_o';

type DbSnapshot = $Shape<{|
  videos: Array<db.Video>,
  videoSegments: Array<db.VideoSegment>,
|}>;

export default class Video {
  /**
   * Creates data for video with given id based on YouTube content
   */
  static async create(id: string): Promise<void> {
    return db.default.runTransaction(async transaction => {
      const videoRef = db.videos.doc(id);
      const videoDoc = await transaction.get(videoRef);

      if (videoDoc.exists) {
        transaction.update(videoRef, {}); // dummy update as required by transactions
        return; // nothing to do here
      }

      const ytResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`
      );
      const [ytVideo] = (await ytResponse.json()).items;
      if (!ytVideo) {
        throw new Error(`Missing YouTube Video with id ${id}`);
      }
      const duration = luxon.Duration.fromISO(ytVideo.contentDetails.duration).as('seconds');

      const segmentId = uuid();

      transaction
        .set(
          videoRef,
          ({
            id,
            duration,
            youtube: ytVideo,
          }: db.Video)
        )
        .set(
          db.videoSegments.doc(segmentId),
          ({
            id: segmentId,
            videoId: id,
            title: 'Segment title',
            start: 300,
            end: duration - 300,
          }: db.VideoSegment)
        );
    });
  }

  static subscribe(id: string, onChange: Video => void, onError: any => void): () => void {
    const dbSnapshot = {};
    const cb = (dbs: DbSnapshot) => {
      const { videos, videoSegments } = Object.assign(dbSnapshot, dbs);
      if (!videos || !videoSegments) {
        return; // still loading data
      }

      try {
        onChange(new Video(dbSnapshot));
      } catch (e) {
        onError(e);
      }
    };
    const unsubs = [
      db.videos.doc(id).onSnapshot(video => cb({ videos: [video.data()] }), onError),
      db.videoSegments
        .where('videoId', '==', id)
        .onSnapshot(
          videoSegments => cb({ videoSegments: videoSegments.docs.map(doc => doc.data()) }),
          onError
        ),
    ];
    return () => unsubs.forEach(fn => fn());
  }

  static async getSegments(): Promise<Array<db.VideoSegment>> {
    const videoSegments = await db.videoSegments.get();
    return videoSegments.docs.map(doc => doc.data());
  }

  constructor(dbSnapshot: DbSnapshot) {
    this._dbSnapshot = dbSnapshot;

    const { videos, videoSegments } = dbSnapshot;
    invariant(videos && videoSegments, 'videos and videoSegments snapshots required');
    if (videos.length !== 1 || videoSegments.length === 0) {
      throw new errors.MissingVideoError('Expected one video with segments');
    }

    this.data = videos[0];
    this.segments = videoSegments;

    // invariant(
    //   utils.isArraySorted(this.segments, (x, y) => x.index - y.index),
    //   'segments should be sorted by index'
    // );
  }

  _dbSnapshot: DbSnapshot;

  +data: db.Video;
  +segments: Array<db.VideoSegment>;

  async updateSegments(segments: Array<db.VideoSegment>): Promise<void> {
    // invariant(
    //   utils.isArraySorted(segments, (x, y) => x.index - y.index),
    //   'segments should be sorted by index'
    // );

    const batch = db.default.batch();
    segments.forEach(s => batch.set(db.videoSegments.doc(s.id), s));
    this.segments.slice(segments.length).forEach(s => batch.delete(db.videoSegments.doc(s.id)));
    await batch.commit();
  }
}
