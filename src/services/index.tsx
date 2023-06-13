import * as firebase from 'firebase/app';
import * as firebaseui from 'firebaseui';
import 'firebase/auth';
import 'firebase/firestore';
import axios from 'axios';
import qs from 'querystring';
import config, { resources } from '../config';
import httpClient from './http-client.service';
// import * as auth from './auth.service';
import repository from './repository.service';
import authInterceptor from './auth-interceptor.service';
import stats from './stats.service';
import search from './search.service';

export * from './video.service';
export * from './youtube.service';

const app = firebase.initializeApp({
  apiKey: 'AIzaSyCZagAf3bGwKE5PI-URzIDgIm-1okbRACI',
  authDomain: 'twim-knowledge.firebaseapp.com',
  projectId: 'twim-knowledge',
  storageBucket: 'twim-knowledge.appspot.com',
  messagingSenderId: '903042123796',
  appId: '1:903042123796:web:b0a286a5e30d2567faff01',
});

const firebaseAuth = app.auth();

axios.defaults.baseURL = config.serverURI;

// Replace default serializer with one that works with Joi validation
axios.defaults.paramsSerializer = function(params) {
  return qs.stringify(params);
};

// Initialize the repository
(repository as any).install({ httpClient, log: true, resources });

export {
  firebaseAuth,
  firebase,
  firebaseui,
  httpClient,
  repository,
  // auth,
  authInterceptor,
  stats,
  search,
};

export default app;
