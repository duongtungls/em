import { store } from '../store.js'
import {
  GETCHILDRENWITHRANK_VALIDATION_FREQUENCY,
} from '../constants.js'

// util
import { unrank } from './unrank.js'
import { encodeItems } from './encodeItems.js'
import { equalItemsRanked } from './equalItemsRanked.js'
import { compareByRank } from './compareByRank.js'
import { getChildrenWithRankDEPRECATED } from './getChildrenWithRankDEPRECATED.js'
import { getThought } from './getThought.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getChildrenWithRank = (itemsRanked, thoughtIndex, contextChildren) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextChildren = contextChildren || store.getState().contextChildren
  const children = (contextChildren[encodeItems(unrank(itemsRanked))] || []) // eslint-disable-line fp/no-mutating-methods
    .filter(child => {
      if (getThought(child.key, thoughtIndex)) {
        return true
      }
      else {
        // TODO: This should never happen
        // console.warn(`Could not find item thoughtIndex for "${child.key} in ${JSON.stringify(unrank(itemsRanked))}`)

        // Mitigation (does not remove thoughtIndex items)
        // setTimeout(() => {
        //   if (store) {
        //     const state = store.getState()
        //     // check again in case state has changed
        //     if (!getThought(child.key, state.thoughtIndex)) {
        //       const contextEncoded = encodeItems(unrank(itemsRanked))
        //       store.dispatch({
        //         type: 'thoughtIndex',
        //         contextChildrenUpdates: {
        //           [contextEncoded]: (state.contextChildren[contextEncoded] || [])
        //             .filter(child2 => child2.key !== child.key)
        //         }
        //       })
        //     }
        //   }
        // })
        return false
      }
    })
    .map(child => {
      const animateCharsVisible = getThought(child.key, thoughtIndex).animateCharsVisible
      return animateCharsVisible != null
        ? Object.assign({}, child, { animateCharsVisible })
        : child
    })
    .sort(compareByRank)

  const validateGetChildrenDeprecated = Math.random() < GETCHILDRENWITHRANK_VALIDATION_FREQUENCY
  const childrenDEPRECATED = validateGetChildrenDeprecated ? getChildrenWithRankDEPRECATED(unrank(itemsRanked), thoughtIndex) : undefined

  // compare with legacy function a percentage of the time to not affect performance
  if (validateGetChildrenDeprecated && !equalItemsRanked(children, childrenDEPRECATED)) {
    console.warn(`getChildrenWithRank returning different result from getChildrenWithRankDEPRECATED for children of ${JSON.stringify(unrank(itemsRanked))}`)
    console.warn({ children })
    console.warn({ childrenDEPRECATED })
  }

  return children
}
