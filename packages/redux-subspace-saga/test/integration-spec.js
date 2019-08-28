/**
 * Copyright 2017, IOOF Holdings Limited.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createStore, combineReducers } from 'redux'
import { subspace, applyMiddleware, namespaced } from 'redux-subspace'
import { takeEvery, select, put, all, getContext } from 'redux-saga/effects'
import thunk from 'redux-thunk'
import createSagaMiddleware, { subspaced } from '../src'

describe('integration tests', () => {

    const TEST_ACTION_TRIGGER = 'TEST_ACTION_TRIGGER'
    const TEST_THUNK_ACTION_TRIGGER = 'TEST_THUNK_ACTION_TRIGGER'
    const TEST_ACTION = 'TEST_ACTION'

    const childReducer = (state = 'initial value', action) => action.type === TEST_ACTION ? action.value : state
    const parentReducer = combineReducers({ child1: childReducer, child2: namespaced('childNamespace')(childReducer) })
    const rootReducer = combineReducers({ parent1: parentReducer, parent2: namespaced('parentNamespace')(parentReducer) })

    const checkingSaga = (store) => {
        function* makeTestAction(action) {
            const state = yield select((state) => state)
            expect(state).to.deep.equal(store.getState())
            yield put({ type: TEST_ACTION, value: action.value })
        }

        return function* watchTestAction() {
            yield takeEvery(TEST_ACTION_TRIGGER, makeTestAction)
        }
    }

    const checkingThunkSaga = (store) => {
        const thunk = (action) => (dispatch, getState) => {
            expect(getState()).to.deep.equal(store.getState())
            dispatch({
                type: TEST_ACTION_TRIGGER,
                value: action.value
            })
        }

        function* dispatchThunk(action) {
            yield put(thunk(action))
        }

        return function* watchTestThunkAction() {
            yield takeEvery(TEST_THUNK_ACTION_TRIGGER, dispatchThunk)
        }

    }

    const contextAwareSaga = () => {
        function* makeTestAction(action) {
            const value = yield getContext(action.key)
            yield put({ type: TEST_ACTION, value: value })
        }
        return function* watchTestAction() {
            yield takeEvery(TEST_ACTION_TRIGGER, makeTestAction)
        }
    }

    function* sagaWithArgs(value) {
        yield put({ type: TEST_ACTION, value: value })
    }

    it('should work with no subspaces', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        sagaMiddleware.run(checkingSaga(rootStore))

        rootStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })
    
    it('should work with no namespace single subspace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        sagaMiddleware.run(checkingSaga(rootStore))

        const parentStore = subspace((state) => state.parent1)(rootStore)

        rootStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'parent value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should work with no namespace nested subspaces', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        sagaMiddleware.run(checkingSaga(rootStore))

        const parentStore = subspace((state) => state.parent1)(rootStore)

        const childStore = subspace((state) => state.child1)(parentStore)

        rootStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'parent value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        childStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'child value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'child value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should work with namespaced single subspace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentStore = subspace((state) => state.parent2, 'parentNamespace')(rootStore)

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                subspaced((state) => state.parent2, 'parentNamespace')(checkingSaga(parentStore))()
            ])
        }

        sagaMiddleware.run(rootSaga)

        rootStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'parent value',
                child2: 'initial value'
            }
        })
    })

    it('should work with namespaced nested subspace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentStore = subspace((state) => state.parent2, 'parentNamespace')(rootStore)

        const childStore = subspace((state) => state.child2, 'childNamespace')(parentStore)

        function* parentSaga() {
            yield all([
                checkingSaga(parentStore)(),
                subspaced((state) => state.child2, 'childNamespace')(checkingSaga(childStore))()
            ])
        }

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                subspaced((state) => state.parent2, 'parentNamespace')(parentSaga)()
            ])
        }

        sagaMiddleware.run(rootSaga)

        rootStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'parent value',
                child2: 'initial value'
            }
        })

        childStore.dispatch({ type: TEST_ACTION_TRIGGER, value: 'child value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'parent value',
                child2: 'child value'
            }
        })
    })
    
    it('should work with thunk and no subspaces', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(thunk, sagaMiddleware))

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                checkingThunkSaga(rootStore)()
            ]);
        }

        sagaMiddleware.run(rootSaga)

        rootStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should work with thunk and no namespace single subspace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(thunk, sagaMiddleware))

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                checkingThunkSaga(rootStore)()
            ]);
        }

        sagaMiddleware.run(rootSaga)

        const parentStore = subspace((state) => state.parent1)(rootStore)

        rootStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'parent value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should work with thunk and no namespace nested subspaces', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(thunk, sagaMiddleware))

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                checkingThunkSaga(rootStore)()
            ]);
        }

        sagaMiddleware.run(rootSaga)

        const parentStore = subspace((state) => state.parent1)(rootStore)

        const childStore = subspace((state) => state.child1)(parentStore)

        rootStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'parent value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        childStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'child value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'child value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should work with thunk and namespaced single subspace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(thunk, sagaMiddleware))

        const parentStore = subspace((state) => state.parent2, 'parentNamespace')(rootStore)

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                checkingThunkSaga(rootStore)(),
                subspaced((state) => state.parent2, 'parentNamespace')(checkingSaga(parentStore))(),
                subspaced((state) => state.parent2, 'parentNamespace')(checkingThunkSaga(parentStore))()
            ])
        }

        sagaMiddleware.run(rootSaga)

        rootStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'parent value',
                child2: 'initial value'
            }
        })
    })

    it('should work with thunk and namespaced nested subspace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(thunk, sagaMiddleware))

        const parentStore = subspace((state) => state.parent2, 'parentNamespace')(rootStore)

        const childStore = subspace((state) => state.child2, 'childNamespace')(parentStore)

        function* parentSaga() {
            yield all([
                checkingSaga(parentStore)(),
                checkingThunkSaga(parentStore)(),
                subspaced((state) => state.child2, 'childNamespace')(checkingSaga(childStore))(),
                subspaced((state) => state.child2, 'childNamespace')(checkingThunkSaga(childStore))()
            ])
        }

        function* rootSaga() {
            yield all([
                checkingSaga(rootStore)(),
                checkingThunkSaga(rootStore)(),
                subspaced((state) => state.parent2, 'parentNamespace')(parentSaga)()
            ])
        }

        sagaMiddleware.run(rootSaga)

        rootStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'root value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })

        parentStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'parent value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'parent value',
                child2: 'initial value'
            }
        })

        childStore.dispatch({ type: TEST_THUNK_ACTION_TRIGGER, value: 'child value' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'root value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'parent value',
                child2: 'child value'
            }
        })
    })

    it('should transfer context to subspaced saga', () => {
        const sagaMiddleware = createSagaMiddleware({ context: { fromContext: 'context value'} })

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentStore = subspace((state) => state.parent1)(rootStore)

        const parentSaga = subspaced((state) => state.parent1)(contextAwareSaga())

        sagaMiddleware.run(parentSaga)

        parentStore.dispatch({ type: TEST_ACTION_TRIGGER, key: 'fromContext' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'context value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should transfer context to nested subspaced saga', () => {
        const sagaMiddleware = createSagaMiddleware({ context: { fromContext: 'context value'} })

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentStore = subspace((state) => state.parent1)(rootStore)

        const childStore = subspace((state) => state.child1)(parentStore)

        const childSaga = subspaced((state) => state.child1)(contextAwareSaga())

        const parentSaga = subspaced((state) => state.parent1)(childSaga)

        sagaMiddleware.run(parentSaga)

        childStore.dispatch({ type: TEST_ACTION_TRIGGER, key: 'fromContext' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'context value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should transfer context to subspaced saga with namespace', () => {
        const sagaMiddleware = createSagaMiddleware({ context: { fromContext: 'context value'} })

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentStore = subspace((state) => state.parent2, 'parentNamespace')(rootStore)

        const parentSaga = subspaced((state) => state.parent2, 'parentNamespace')(contextAwareSaga())

        sagaMiddleware.run(parentSaga)

        parentStore.dispatch({ type: TEST_ACTION_TRIGGER, key: 'fromContext' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'initial value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'context value',
                child2: 'initial value'
            }
        })
    })

    it('should transfer context to nested subspaced saga with namespace', () => {
        const sagaMiddleware = createSagaMiddleware({ context: { fromContext: 'context value'} })

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentStore = subspace((state) => state.parent2, 'parentNamespace')(rootStore)

        const childStore = subspace((state) => state.child2, 'childNamespace')(parentStore)

        const childSaga = subspaced((state) => state.child2, 'childNamespace')(contextAwareSaga())

        const parentSaga = subspaced((state) => state.parent2, 'parentNamespace')(childSaga)

        sagaMiddleware.run(parentSaga)

        childStore.dispatch({ type: TEST_ACTION_TRIGGER, key: 'fromContext' })

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'initial value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'context value'
            }
        })
    })

    it('should pass args through to subspaced saga', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentSaga = subspaced((state) => state.parent1)(sagaWithArgs)

        sagaMiddleware.run(parentSaga, 'args value')

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'args value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should pass args through to nested subspaced saga', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const childSaga = subspaced((state) => state.child1)(sagaWithArgs)

        const parentSaga = subspaced((state) => state.parent1)(childSaga)

        sagaMiddleware.run(parentSaga, 'args value')

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'args value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'initial value'
            }
        })
    })

    it('should pass args through to subspaced saga with namespace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const parentSaga = subspaced((state) => state.parent2, 'parentNamespace')(sagaWithArgs)

        sagaMiddleware.run(parentSaga, 'args value')

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'initial value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'args value',
                child2: 'initial value'
            }
        })
    })

    it('should pass args through to nested subspaced saga with namespace', () => {
        const sagaMiddleware = createSagaMiddleware()

        const rootStore = createStore(rootReducer, applyMiddleware(sagaMiddleware))

        const childSaga = subspaced((state) => state.child2, 'childNamespace')(sagaWithArgs)

        const parentSaga = subspaced((state) => state.parent2, 'parentNamespace')(childSaga)

        sagaMiddleware.run(parentSaga, 'args value')

        expect(rootStore.getState()).to.deep.equal({
            parent1: {
                child1: 'initial value',
                child2: 'initial value'
            },
            parent2: {
                child1: 'initial value',
                child2: 'args value'
            }
        })
    })
})
