/**
 * Copyright 2017, IOOF Holdings Limited.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createStore, combineReducers, Reducer } from 'redux'
import { subspace, Subspace } from '../../../src'

interface ChildState {
    value: string
}

interface ParentState {
    child: ChildState
}

interface RootState {
    parent: ParentState
}

interface CustomState extends ChildState {
    parent: ParentState
}

const childReducer: Reducer<ChildState> = (state) => state

const parentReducer = combineReducers<ParentState>({ child: childReducer })

const rootReducer = combineReducers<RootState>({ parent: parentReducer })

const store = createStore(rootReducer)

const subStore: Subspace<ParentState, RootState, RootState> = subspace<RootState, ParentState>((state) => state.parent)(store)
const namespacedStore: Subspace<ParentState> = subspace('parent')(store)
const subspacedStore: Subspace<ParentState, RootState, RootState> = subspace<RootState, ParentState>((state) => state.parent, 'parent')(store)

const subStoreWithRoot: Subspace<ParentState, RootState, ParentState>  = subspace<ParentState, RootState, ParentState>((state, rootState) => rootState.parent)(subspacedStore)
const subspacedStoreWithRoot: Subspace<ParentState, RootState, ParentState>  = subspace<ParentState, RootState, ParentState>((state, rootState) => rootState.parent, 'parent')(subspacedStore)

const subStoreWithCombinedState: Subspace<CustomState, RootState, ParentState>  = subspace<ParentState, RootState, CustomState>((state, rootState) => ({ ...state.child, parent: rootState.parent }))(subspacedStore)
const subspacedStoreWithCombinedState: Subspace<CustomState, RootState, ParentState>  = subspace<ParentState, RootState, CustomState>((state, rootState) => ({ ...state.child, parent: rootState.parent }), 'custom')(subspacedStore)

subStore.processAction({ type: 'EXAMPLE' }, (action) => { console.log(action) })
const type1 = subStore.processAction({ type: 'EXAMPLE' }, (action) => action.type)
const type2 = subStore.processAction({ type: 'EXAMPLE' }, (action) => action.type, 'default')
