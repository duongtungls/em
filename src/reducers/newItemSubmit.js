// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  encodeItems,
  equalItemRanked,
  getNextRank,
  getThought,
  hashThought,
  notNull,
  head,
  sync,
  timestamp,
} from '../util.js'

// SIDE EFFECTS: sync
// addAsContext adds the given context to the new item
export const newItemSubmit = (state, { value, context, addAsContext, rank }) => {

  // create item if non-existent
  const item = Object.assign({}, getThought(value, state.thoughtIndex) || {
      value: value,
      memberOf: [],
      created: timestamp()
    }, notNull({
      lastUpdated: timestamp()
    })
  )

  // store children indexed by the encoded context for O(1) lookup of children
  const contextEncoded = encodeItems(addAsContext ? [value] : context)
  const contextChildrenUpdates = {}
  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  if (context.length > 0) {
    const newContextChild = Object.assign({
      key: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank([{ key: value, rank }], state.thoughtIndex, state.contextChildren) : rank,
      created: timestamp(),
      lastUpdated: timestamp()
    })
    const itemChildren = (state.contextChildren[contextEncoded] || [])
      .filter(child => !equalItemRanked(child, newContextChild))
      .concat(newContextChild)
    contextChildrenUpdates[contextEncoded] = itemChildren
  }

  // if adding as the context of an existing item
  let itemChildNew // eslint-disable-line fp/no-let
  if (addAsContext) {
    const itemChildOld = getThought(head(context), state.thoughtIndex)
    itemChildNew = Object.assign({}, itemChildOld, {
      memberOf: itemChildOld.memberOf.concat({
        context: [value],
        rank: getNextRank([{ key: value, rank }], state.thoughtIndex, state.contextChildren)
      }),
      created: itemChildOld.created,
      lastUpdated: timestamp()
    })

    setTimeout(() => {
      sync({
        [hashThought(itemChildNew.value)]: itemChildNew
      })
    }, RENDER_DELAY)
  }
  else {
    if (!item.memberOf) {
      item.memberOf = []
    }
    // floating thought (no context)
    if (context.length > 0) {
      item.memberOf.push({ // eslint-disable-line fp/no-mutating-methods
        context,
        rank
      })
    }
  }

  // get around requirement that reducers cannot dispatch actions
  setTimeout(() => {
    sync({
      [hashThought(item.value)]: item
    }, contextChildrenUpdates)
  }, RENDER_DELAY)

  return {
    thoughtIndex: Object.assign({}, state.thoughtIndex, {
      [hashThought(value)]: item
    }, itemChildNew ? {
      [hashThought(itemChildNew.value)]: itemChildNew
    } : null),
    dataNonce: state.dataNonce + 1,
    contextChildren: newContextChildren
  }
}
