import React from 'react'
import { connect } from 'react-redux'

// components
import ContentEditable from 'react-contenteditable'

// util
import {
  equalItemsRanked,
  getThought,
  headKey,
  strip,
} from '../util.js'

export const Code = connect(({ cursorBeforeEdit, cursor, thoughtIndex }, props) => {

  const isEditing = equalItemsRanked(cursorBeforeEdit, props.itemsRanked)

  // use live items if editing
  const itemsRanked = isEditing
    ? cursor || []
    : props.itemsRanked

  const value = headKey(itemsRanked)

  return {
    code: getThought(value, thoughtIndex) && getThought(value, thoughtIndex).code,
    itemsRanked
  }
})(({ code, itemsRanked, dispatch }) => {

  return <code>
    <ContentEditable
      html={code || ''}
      onChange={e => {
        // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
        const newValue = strip(e.target.value)
        dispatch({ type: 'codeChange', itemsRanked, newValue })
      }}
    />
  </code>
})
