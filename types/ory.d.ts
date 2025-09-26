import { UiNodeAttributes } from '@ory/client'

declare module '@ory/client' {
  interface UiNodeInputAttributes extends UiNodeAttributes {
    node_type: 'input'
    name: string
    type: string
    value?: any
    required?: boolean
    disabled?: boolean
    onclick?: string
  }

  interface UiNodeButtonAttributes extends UiNodeAttributes {
    node_type: 'input'
    name: string
    type: 'submit' | 'button'
    value?: any
    disabled?: boolean
    onclick?: string
  }
}
