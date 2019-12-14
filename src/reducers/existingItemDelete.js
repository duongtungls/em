// util
import {
  encodeItems,
  equalItemRanked,
  exists,
  getChildrenWithRank,
  getThought,
  hashThought,
  removeContext,
  rootedContextOf,
  head,
  sync,
  unrank,
} from '../util.js'

// SIDE EFFECTS: sync
export const existingItemDelete = (state, { itemsRanked, rank, showContexts }) => {

  const items = unrank(itemsRanked)
  if (!exists(head(items), state.thoughtIndex)) return

  const value = head(items)
  const item = getThought(value, state.thoughtIndex)
  const context = rootedContextOf(items)
  const newData = { ...state.thoughtIndex }

  // the old item less the context
  const newOldItem = item.memberOf && item.memberOf.length > 1
    ? removeContext(item, context, showContexts ? null : rank)
    : null

  // update local thoughtIndex so that we do not have to wait for firebase
  if (newOldItem) {
    newData[hashThought(value)] = newOldItem
  }
  else {
    delete newData[hashThought(value)] // eslint-disable-line fp/no-delete
  }

  const contextEncoded = encodeItems(context)
  const itemChildren = (state.contextChildren[contextEncoded] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank }))

  // generates a firebase update object that can be used to delete/update all descendants and delete/update contextChildren
  const recursiveDeletes = (itemsRanked, accumRecursive = {}) => {
    return getChildrenWithRank(itemsRanked, newData, state.contextChildren).reduce((accum, child) => {
      const hashedKey = hashThought(child.key)
      const childItem = getThought(child.key, newData)
      const childNew = childItem && childItem.memberOf && childItem.memberOf.length > 1
        // update child with deleted context removed
        ? removeContext(childItem, unrank(itemsRanked), child.rank)
        // if this was the only context of the child, delete the child
        : null

      // update local thoughtIndex so that we do not have to wait for firebase
      if (childNew) {
        newData[hashedKey] = childNew
      }
      else {
        delete newData[hashedKey] // eslint-disable-line fp/no-delete
      }

      const contextEncoded = encodeItems(unrank(itemsRanked))

      const dataMerged = {
        ...accumRecursive.thoughtIndex,
        ...accum.thoughtIndex,
        [hashedKey]: childNew
      }

      const contextChildrenMerged = {
        ...accumRecursive.contextChildren,
        ...accum.contextChildren,
        [contextEncoded]: null
      }

      // RECURSION
      const recursiveResults = recursiveDeletes(itemsRanked.concat(child), {
        thoughtIndex: dataMerged,
        contextChildren: contextChildrenMerged
      })

      return {
        thoughtIndex: {
          ...dataMerged,
          ...recursiveResults.thoughtIndex
        },
        contextChildren: {
          ...contextChildrenMerged,
          ...recursiveResults.contextChildren
        }
      }
    }, {
      thoughtIndex: {},
      contextChildren: {}
    })
  }

  // do not delete descendants when the thought has a duplicate sibling
  const hasDuplicateSiblings = itemChildren.some(child => hashThought(child.key) === hashThought(value))
  const descendantUpdatesResult = !hasDuplicateSiblings
    ? recursiveDeletes(itemsRanked)
    : {
      thoughtIndex: {},
      contextChildren: {}
    }

  const thoughtIndexUpdates = {
    [hashThought(value)]: newOldItem,
    ...descendantUpdatesResult.thoughtIndex,
    // emptyContextDelete
  }

  const contextChildrenUpdates = {
    // current thought
    [contextEncoded]: itemChildren.length > 0 ? itemChildren : null,
    // descendants
    ...descendantUpdatesResult.contextChildren
  }
  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  // null values must be manually deleted in state
  // current thought
  if (!itemChildren || itemChildren.length === 0) {
    delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
  }
  // descendants
  Object.keys(descendantUpdatesResult.contextChildren).forEach(contextEncoded => {
    const itemChildren = descendantUpdatesResult.contextChildren[contextEncoded]
    if (!itemChildren || itemChildren.length === 0) {
      delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(thoughtIndexUpdates, contextChildrenUpdates, { state: false })
  })

  return {
    thoughtIndex: newData,
    dataNonce: state.dataNonce + 1,
    contextChildren: newContextChildren
  }
}
