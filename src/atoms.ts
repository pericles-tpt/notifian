import {atom, createStore} from 'jotai';
import {State} from './db/json';

export const store = createStore();
export const state = atom<State | null>(null);
export const isScanning = atom(false);
