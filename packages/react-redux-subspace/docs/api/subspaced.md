# `subspaced(mapState, [namespace])`

A [higher-order React component](https://facebook.github.io/react/docs/higher-order-components.html) that wraps a component in a [`SubspaceProvider`](/packages/react-redux-subspace/docs/api/SubspaceProvider.md).

## Arguments

1. `mapState` (_Function|string_): A [selector to derive the state](/docs/basics/CreatingSubspaces.md) of the subspace. The selector is provided the parent state as the first parameter and the root state as the second parameter. If passed as a string, a selector is created for that key on the provided state.
2. `namespace` (_string_): An optional [namespace to scope actions](/docs/basics/Namespacing.md) with.
3. `options` (_Object_): An optional object to supply the following options:
   - `context` (_React.Context|Object_): Override the React Context used for accessing the store. An object can be passed with separate `parent` and `child` contexts if required.

If `mapState` is passed as a string and no `namespace` is provided, the provided string is used for both. To prevent this, pass `null` as the second parameter.

## Returns

(_Function_): A function that takes a React Component and returns it wrapped in a `SubspaceProvider`.

## Examples

```javascript
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const SubspacedComponent = subspaced(state => state.subApp)(AComponent)
```

```javascript
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const SubspacedComponent = subspaced((state, rootState) => ({
  ...state.subApp,
  root: rootState
}))(AComponent)
```

```javascript
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const SubspacedComponent = subspaced(state => state.subApp, "subApp")(
  AComponent
)
```

```javascript
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const SubspacedComponent = subspaced("subApp", "subAppNamespace")(AComponent)
```

```javascript
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const SubspacedComponent = subspaced("subApp")(AComponent)
```

```javascript
import React from "react"
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const CustomReduxContext = React.createContext()

const SubspacedComponent = subspaced(state => state.subApp, "subApp", {
  context: CustomReduxContext
})(AComponent)
```

```javascript
import React from "react"
import { subspaced } from "react-redux-subspace"
import AComponent from "somewhere"

const CustomParentContext = React.createContext()
const CustomChildContext = React.createContext()

const SubspacedComponent = subspaced(state => state.subApp, "subApp", {
  context: { parent: CustomParentContext, child: CustomChildContext }
})(AComponent)
```
