import * as components from '../../components';
import * as utils from '../../utils';
import React, { useGlobal } from 'reactn';
import * as services from '../../services';
import * as errors from '../../errors';
import { captureAndLog, toastError } from '../../utils';
import { Video, VideoSegment } from '../../types';

const channelId = 'UCYwlraEwuFB4ZqASowjoM0g';

const {
  Button,
  Link,
  Grid,
  AppHeader,
  VideoList,
  Header,
  Icon,
  Container,
  Divider,
  Loading,
  Checkbox,
  Card,
} = components;

const Home = ({ videoId }: { videoId: string }) => {
  const [error, setError] = React.useState();
  const [loadingVideos, setLoadingVideos] = React.useState(true);
  const [loadingSelectedVideo, setLoadingSelectedVideo] = React.useState(true);
  const [loadingSegments, setLoadingSegments] = React.useState(true);
  const [segments, setSegments] = React.useState(undefined as Array<VideoSegment> | void);
  const [mySegments, setMySegments] = React.useState(undefined as Array<VideoSegment> | void);
  const [selectedVideo, setSelectedVideo] = React.useState();
  const [videos, setVideos] = React.useState([]);
  const [videoSegmentMap, setVideoSegmentMap] = React.useState({});
  const [filterProcessedVideos, setFilterProcessedVideos] = React.useState(false);
  const [segmentVideo, setSegmentVideo] = React.useState();
  const [currentUser] = (useGlobal as any)('user');

  const selectVideo = async (videoId: any) => {
    utils.history.push(`/${videoId}`);
  };

  // Fetch the default list of videos from the MBT uploads list
  React.useEffect(() => {
    // We grab videos from the MBT 'uploads' playlist to save on youtube api search quota points
    async function fetchVideos() {
      try {
        setLoadingVideos(true);

        // We're piggybacking this view to update the stats for now
        await (services as any).stats.logStats();

        const response = await (services as any).youtube({
          endpoint: 'playlistItems',
          params: {
            playlistId: 'UUYwlraEwuFB4ZqASowjoM0g',
          },
        });
        const mbtVids = response.map((v: any) => ({
          snippet: v.snippet,
          id: {
            videoId: v.snippet.resourceId.videoId,
          },
        }));
        setVideos(mbtVids);
        !videoId && selectVideo(`_ok27SPHhwA`);
      } catch (err) {
        captureAndLog('Home', 'fetchVideos', err);
        toastError(
          'There was an error fetching youtube data. Please refresh the page and try again.',
          err
        );
      } finally {
        setLoadingVideos(false);
      }
    }
    fetchVideos();
  }, []);

  // Fetch the selected video from youtube
  React.useEffect(() => {
    async function fetchSelectedVideo() {
      try {
        setLoadingSelectedVideo(true);
        const [video] = await (services as any).youtube({
          endpoint: 'videos',
          params: {
            id: videoId,
          },
        });
        setSelectedVideo(video);
      } catch (err) {
        setLoadingSelectedVideo(false);
        captureAndLog('Home', 'fetchSelectedVideo', err);
        toastError(
          'There was an error fetching youtube data. Please refresh the page and try again.',
          err
        );
      } finally {
        setLoadingSelectedVideo(false);
      }
    }
    videoId && fetchSelectedVideo();
  }, [videoId]);

  // Get the segments for the selected video
  React.useEffect(() => {
    const fetchSegmentVideo = async () => {
      try {
        setLoadingSegments(true);
        const video = (
          await (services as any).repository.video.list({
            ytId: videoId,
            $embed: ['segments'],
          })
        ).data.docs[0];
        video ? setSegmentVideo(video) : setSegments([]);
      } catch (err) {
        captureAndLog('Home', 'fetchSegmentVideo', err);
        toastError(
          'There was an error fetching the selected video data. Please refresh the page and try again.',
          err
        );
      } finally {
        setLoadingSegments(false);
      }
    };
    videoId ? fetchSegmentVideo() : setSegments([]);
  }, [videoId]);

  // Mark videos that have segments already
  React.useEffect(() => {
    const fetchProcessedVideos = async () => {
      try {
        setLoadingVideos(true);
        const videoIds = videos.map((v: any) => v.id.videoId);
        const vidsWithSegs = (
          await (services as any).repository.video.list({
            ytId: videoIds,
            $select: ['ytId'],
            $embed: ['segments'],
          })
        ).data.docs;
        const vidSegMap = {};
        for (const vid of vidsWithSegs) {
          if (vid.segments.length > 0) {
            (vidSegMap as any)[vid.ytId] = true;
          }
        }
        setVideoSegmentMap(vidSegMap);
      } catch (err) {
        captureAndLog('Home', 'fetchProcessedVideos', err);
        toastError(
          'There was an error fetching the processed video data. Please refresh the page and try again.',
          err
        );
      } finally {
        setLoadingVideos(false);
      }
    };
    videos ? fetchProcessedVideos() : (() => {})();
  }, [videos]);

  React.useEffect(() => {
    setSegments(segmentVideo ? (segmentVideo as any).segments : []);
  }, [segmentVideo]);

  React.useEffect(() => {
    segments &&
      setMySegments(segments.filter(s => currentUser && s.ownerEmail === currentUser.email));
  }, [segments, currentUser]);

  const videoSrc = selectedVideo
    ? `https://www.youtube.com/embed/${(selectedVideo as any).id.videoId ||
        (selectedVideo as any).id}`
    : '';

  // Search youtube videos from the MBT channel
  const searchVideos = async (term: any) => {
    try {
      setLoadingVideos(true);
      const response = await (services as any).youtube({
        endpoint: 'search',
        params: {
          q: term,
        },
      });

      // Filter out any videos that don't belong to the MBT channel
      const mbtVids = response.filter((v: any) => v.snippet.channelId === channelId);

      setVideos(mbtVids);
    } catch (err) {
      captureAndLog('Home', 'searchVideos', err);
      toastError(
        'There was an error fetching youtube data. Please refresh the page and try again.',
        err
      );
    } finally {
      setLoadingVideos(false);
    }
  };

  const createVideo = (event: any) => {
    event.preventDefault();
    utils.history.push(`/edit/${videoId}`);
  };

  return (
    <div>
      <AppHeader onHandleSubmit={searchVideos} showSearchbar={true} />
      <Grid>
        <Grid.Row>
          <Grid.Column style={{ marginLeft: 30 }} width={11}>
            {!loadingSelectedVideo ? (
              <div>
                {selectedVideo ? (
                  <div>
                    <div className="ui embed">
                      <iframe src={videoSrc} allowFullScreen title="Video player" />
                    </div>
                    <div className="ui segment">
                      <h4 className="ui header">{(selectedVideo as any).snippet.title}</h4>
                      <p>{(selectedVideo as any).snippet.description}</p>
                    </div>
                  </div>
                ) : (
                  <div>Select a video</div>
                )}
                <br />

                <Button
                  color="teal"
                  size="big"
                  onClick={() => utils.history.push(`/edit/${videoId}`)}
                >
                  <Icon name="plus" /> New Segment
                </Button>

                <br />
                {!loadingSegments ? (
                  <div>
                    {currentUser && (
                      <div>
                        <Divider horizontal>
                          <Header as="h2">
                            <Icon name="user" color="blue" />
                            <Header.Content>Your Segments</Header.Content>
                          </Header>
                        </Divider>
                        {mySegments && mySegments.length > 0 ? (
                          <Container>
                            <Grid celled="internally">
                              <Grid.Row>
                                <Grid.Column verticalAlign="middle" width={3}>
                                  <h4>Segment Title</h4>
                                </Grid.Column>
                                <Grid.Column width={9}>
                                  <h4>Description</h4>
                                </Grid.Column>
                                <Grid.Column width={2}>
                                  <h4>Edit</h4>
                                </Grid.Column>
                                <Grid.Column width={2}>
                                  <h4>Watch</h4>
                                </Grid.Column>
                              </Grid.Row>
                              {mySegments.map(segment => (
                                <Grid.Row key={(segment as any).segmentId}>
                                  <Grid.Column verticalAlign="middle" width={3}>
                                    <Link
                                      to={`/watch/${(segment as any).videoYtId}/${
                                        (segment as any).segmentId
                                      }`}
                                    >
                                      {(segment as any).title}
                                    </Link>
                                  </Grid.Column>
                                  <Grid.Column textAlign="left" width={9}>
                                    {(segment as any).description || 'No description available.'}
                                  </Grid.Column>
                                  <Grid.Column width={2}>
                                    <Icon
                                      link={true}
                                      style={{ marginLeft: 10 }}
                                      size="big"
                                      name="edit"
                                      color="blue"
                                      onClick={() =>
                                        utils.history.push(
                                          `/edit/${(segment as any).videoYtId}/${
                                            (segment as any).segmentId
                                          }`
                                        )
                                      }
                                    />
                                  </Grid.Column>
                                  <Grid.Column width={2}>
                                    <Icon
                                      link={true}
                                      size="big"
                                      name="video play"
                                      color="green"
                                      onClick={() =>
                                        utils.history.push(
                                          `/watch/${(segment as any).videoYtId}/${
                                            (segment as any).segmentId
                                          }`
                                        )
                                      }
                                    />
                                  </Grid.Column>
                                </Grid.Row>
                              ))}
                            </Grid>
                          </Container>
                        ) : (
                          selectedVideo && (
                            <div>
                              You don't have any segments for this video.{' '}
                              <Link onClick={createVideo} to="">
                                Try adding one!
                              </Link>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <Divider horizontal style={{ marginTop: 75 }}>
                      <Header as="h2">
                        <Icon name="video" color="green" />
                        <Header.Content>All Segments</Header.Content>
                      </Header>
                    </Divider>
                    {segments && segments.length > 0 ? (
                      <Container>
                        <Grid celled="internally">
                          <Grid.Row>
                            <Grid.Column verticalAlign="middle" width={3}>
                              <h4>Segment Title</h4>
                            </Grid.Column>
                            <Grid.Column width={11}>
                              <h4>Description</h4>
                            </Grid.Column>
                            <Grid.Column width={2}>
                              <h4>Watch</h4>
                            </Grid.Column>
                          </Grid.Row>
                          {segments.map(segment => (
                            <Grid.Row key={(segment as any).segmentId}>
                              <Grid.Column verticalAlign="middle" width={3}>
                                <Link
                                  to={`/watch/${(segment as any).videoYtId}/${
                                    (segment as any).segmentId
                                  }`}
                                >
                                  {(segment as any).title}
                                </Link>
                              </Grid.Column>
                              <Grid.Column textAlign="left" width={11}>
                                {(segment as any).description || 'No description available.'}
                              </Grid.Column>
                              <Grid.Column width={2}>
                                <Icon
                                  link={true}
                                  size="big"
                                  name="video play"
                                  color="green"
                                  onClick={() =>
                                    utils.history.push(
                                      `/watch/${(segment as any).videoYtId}/${
                                        (segment as any).segmentId
                                      }`
                                    )
                                  }
                                />
                              </Grid.Column>
                            </Grid.Row>
                          ))}
                        </Grid>
                      </Container>
                    ) : (
                      selectedVideo && (
                        <div>
                          No segments for this video.{' '}
                          <Link onClick={createVideo} to="">
                            Add the first one!
                          </Link>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <Loading>Loading segments...</Loading>
                )}
              </div>
            ) : (
              <Loading>Loading video...</Loading>
            )}
          </Grid.Column>
          <Grid.Column style={{ color: 'white' }} verticalAlign="middle" width={4}>
            {!loadingVideos ? (
              <div>
                {videos && videos.length > 0 ? (
                  <div>
                    <Card fluid color="blue">
                      <Card.Content>
                        <Card.Header>
                          <Checkbox
                            toggle
                            label="Hide Processed Videos"
                            checked={filterProcessedVideos}
                            onChange={(event, data) =>
                              setFilterProcessedVideos((data as any).checked)
                            }
                          />
                        </Card.Header>
                      </Card.Content>
                    </Card>
                    <VideoList
                      videos={videos as any}
                      videoSegmentMap={videoSegmentMap}
                      filterProcessedVideos={filterProcessedVideos}
                      handleVideoSelect={(video: any) => video && selectVideo(video.id.videoId)}
                    />
                  </div>
                ) : (
                  <h2 style={{ color: 'black' }}>
                    No videos found. Try searching searching for something less specific or if
                    searching for a title make sure the title is exact.{' '}
                  </h2>
                )}
              </div>
            ) : (
              <Loading>Loading videos...</Loading>
            )}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </div>
  );
};

export default Home;