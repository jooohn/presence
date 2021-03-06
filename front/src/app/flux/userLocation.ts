import { Action } from 'redux';
import { combineEpics, Epic } from 'redux-observable';
import { of } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import {
  ActionType,
  createAction,
  createAsyncAction,
  createStandardAction,
  getType,
  isActionOf
} from 'typesafe-actions';
import { CreateUserLocationPayload, default as api } from '../shared/api';
import { UserLocation, UserLocationId } from '../types/userLocation';
import { RootState } from './index';

export type UserLocationState = {

  userLocations: UserLocation[]

  activeUserLocationIds: UserLocationId[]

  loading: boolean

  registrationDialog: {
    error?: string
  } | null

}
const initialState: UserLocationState = {
  userLocations: [],
  activeUserLocationIds: [],
  loading: false,
  registrationDialog: null,
};

const toggleUserLocationSelection = createStandardAction('userLocation/TOGGLE_SELECTION')<UserLocationId>();

const fetchUserLocations = createAsyncAction(
  'userLocation/FETCH_REQUEST',
  'userLocation/FETCH_SUCCESS',
  'userLocation/FETCH_FAILURE'
)<void, UserLocation[], Error>();

const fetchUserLocationsEpic: Epic<Action, Action, RootState> =
  (action$, state$) =>
    action$
      .pipe(
        filter(isActionOf(fetchUserLocations.request)),
        switchMap(() =>
          fromPromise(api.fetchUserLocations()).pipe(
            map(fetchUserLocations.success),
            catchError(e => of(fetchUserLocations.failure(e)))
          )
        )
      );

const openUserLocationRegistrationDialog = createAction('userLocation/OPEN_REGISTRATION_DIALOG');
const closeUserLocationRegistrationDialog = createAction('userLocation/CLOSE_REGISTRATION_DIALOG');

const createUserLocation = createAsyncAction(
  'userLocation/CREATE_REQUEST',
  'userLocation/CREATE_SUCCESS',
  'userLocation/CREATE_FAILURE'
)<CreateUserLocationPayload, UserLocation, Error>();

const createUserLocationEpic: Epic<Action, Action, RootState> =
  (action$, state$) =>
    action$
      .pipe(
        filter(isActionOf(createUserLocation.request)),
        map(({ payload }) => payload),
        switchMap((payload: CreateUserLocationPayload) =>
          fromPromise(api.createUserLocation(payload)).pipe(
            map(createUserLocation.success),
            catchError(e => of(createUserLocation.failure(e)))
          )
        )
      );

export const userLocationActions = {
  toggleUserLocationSelection,
  openUserLocationRegistrationDialog,
  closeUserLocationRegistrationDialog,

  fetchUserLocations: fetchUserLocations.request,
  createUserLocation: createUserLocation.request,
};
export const userLocationEpics = combineEpics(
  fetchUserLocationsEpic,
  createUserLocationEpic,
);

const actions = {
  toggleUserLocationSelection,
  openUserLocationRegistrationDialog,
  closeUserLocationRegistrationDialog,
  fetchUserLocations,
  createUserLocation,
};

const isActive =
  (state: UserLocationState) =>
    (userLocationId: UserLocationId) =>
      state.activeUserLocationIds.some(id => id === userLocationId);

export const userLocationSelectors = {
  isActive: (state: RootState) => (userLocationId: UserLocationId) =>
    isActive(state.userLocation)(userLocationId),
  getUserLocations: (state: RootState) => state.userLocation.userLocations,
  isLoading: (state: RootState) => state.userLocation.loading,
  isRegistrationDialogOpen: (state: RootState) => state.userLocation.registrationDialog !== null,
};

export default (state: UserLocationState = initialState, action: ActionType<typeof actions>): UserLocationState => {
  switch (action.type) {
    case getType(toggleUserLocationSelection):
      const userLocationId = action.payload;
      return {
        ...state,
        activeUserLocationIds: (isActive(state)(userLocationId))
          ? state.activeUserLocationIds.filter(id => id !== userLocationId)
          : [...state.activeUserLocationIds, userLocationId],
      };
    case getType(fetchUserLocations.request):
      return { ...state, loading: true };
    case getType(fetchUserLocations.success):
      return {
        ...state,
        userLocations: action.payload,
        activeUserLocationIds: action.payload.map(ul => ul.id),
        loading: false,
      };
    case getType(fetchUserLocations.failure):
      alert(action.payload);
      return { ...state, loading: false };

    case getType(openUserLocationRegistrationDialog):
      return { ...state, registrationDialog: {} };
    case getType(closeUserLocationRegistrationDialog):
      return { ...state, registrationDialog: null };

    case getType(createUserLocation.success):
      return { ...state, userLocations: [...state.userLocations, action.payload], registrationDialog: null };
    case getType(createUserLocation.failure):
      return state.registrationDialog !== null
        ? { ...state, registrationDialog: { ...state.registrationDialog, error: action.payload.message } }
        : state;
    default:
      return state;
  }
}
