import React, { Component } from 'react'
import wrapDisplayName from 'recompose/wrapDisplayName'

const startAnimationName = 'onAutofillStart'
const endAnimationName = 'onAutofillCancel'
const styleElementId = 'autofill-style'
const counterAttribute = 'data-counter'

const isWebkit = () => navigator.userAgent.indexOf('WebKit') !== -1

function emptyAnimation(animationName) {
  return `
    @keyframes ${animationName} {
      from {/**/}
      to {/**/}
    }
  `
}

function injectStyle(style) {
  let styleSheet = document.getElementById(styleElementId).sheet

  styleSheet.insertRule(style, styleSheet.cssRules.length)
}

function injectKeyFrames() {
  const autofillStartEmptyKeyframesStyle = emptyAnimation(startAnimationName)
  const autofillEndEmptyKeyframesStyle = emptyAnimation(endAnimationName)

  injectStyle(autofillStartEmptyKeyframesStyle)
  injectStyle(autofillEndEmptyKeyframesStyle)
}

function injectAutofillHook() {
  const autofillHook = `
    input:-webkit-autofill {
      // Expose a hook for JavaScript when autofill is shown.
      // JavaScript can capture 'animationstart' events
      animation-name: ${startAnimationName};

      // Make the backgound color become yellow _really slowly_
      transition: background-color 50000s ease-in-out 0s;
    }
  `

  const notAutofillHook = `
    input:not(:-webkit-autofill) {
      // Expose a hook for JavaScript when autofill is no longer shown.
      // JavaScript can capture 'animationstart' events
      animation-name: ${endAnimationName};
    }`

  injectStyle(autofillHook)
  injectStyle(notAutofillHook)
}

function registerAutofill() {
  let autofillStyle = document.getElementById(styleElementId)

  if (!autofillStyle && isWebkit()) {
    autofillStyle = document.createElement('style')
    autofillStyle.id = styleElementId
    autofillStyle.setAttribute(counterAttribute, 0)
    document.head.appendChild(autofillStyle)

    injectKeyFrames()
    injectAutofillHook()
  }

  let usageCounter = autofillStyle.getAttribute(counterAttribute)
  usageCounter++
  autofillStyle.setAttribute(counterAttribute, usageCounter)
}

function unregisterAutofill() {
  let autofillStyle = document.getElementById(styleElementId)
  let usageCounter = autofillStyle.getAttribute(counterAttribute)
  usageCounter--
  autofillStyle.setAttribute(counterAttribute, usageCounter)

  if (usageCounter === 0) {
    autofillStyle.outerHTML = ''
  }
}

export default autofillProps => Target => {
  class WithAutofillProps extends Component {
    constructor() {
      super()

      this.state = { autofill: false }
    }

    onComponentDidMount() {
      registerAutofill()
    }

    onComponentWillUnmount() {
      unregisterAutofill()
    }

    handleAnimation(animationName) {
      switch (animationName) {
        case startAnimationName:
          return this.setState({ autofill: true })

        case endAnimationName:
          return this.setState({ autofill: false })
      }
    }

    render() {
      const { autofill } = this.state

      return (
        <Target
          onAnimationStart={this.handleAnimation.bind(this)}
          {...this.props}
          {...autofill && autofillProps}
        />
      )
    }
  }

  WithAutofillProps.displayName = wrapDisplayName(Target, 'withAutofillProps')

  return WithAutofillProps
}
