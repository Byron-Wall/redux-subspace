/**
 * Copyright 2017, IOOF Holdings Limited.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Action } from 'redux'
import { Epic } from 'redux-observable'
import { MapState } from 'redux-subspace'

export interface EpicDecorator {
    <T extends Action, S, D = any>(epic: Epic<T, S, D>): Epic<T, S, D>
}

export interface Subspaced {
    <TParentState, TSubState>(mapState: MapState<TParentState, any, TSubState>): EpicDecorator;
    <TParentState, TSubState>(mapState: MapState<TParentState, any, TSubState>, namespace: string): EpicDecorator;
    <TParentState, TRootState, TSubState>(mapState: MapState<TParentState, TRootState, TSubState>): EpicDecorator;
    <TParentState, TRootState, TSubState>(mapState: MapState<TParentState, TRootState, TSubState>, namespace: string): EpicDecorator;
    (namespace: string): EpicDecorator;
}

export const subspaced: Subspaced;

export { createEpicMiddleware } from 'redux-observable';
