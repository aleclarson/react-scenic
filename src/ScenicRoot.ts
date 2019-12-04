import is from '@alloc/is'
import React from 'react'
import { noto, o } from 'wana'
import { Scene } from './Scene'

declare const console: any

export class ScenicRoot {
  /** Flat map of cached scenes */
  cache = new Map<string, Scene>()

  /** Flat list of visited scenes */
  visited: Scene[]

  /** The current position in `visited` array */
  index = 0

  constructor(
    /** The path of the currently focused scene. */
    public path: string
  ) {
    this.visited = o([this.get(path)])
    return o(this)
  }

  /** Provided by the `<Scenic>` component */
  static Context = React.createContext<ScenicRoot | null>(null)

  /** Get the current scene */
  get(): Scene
  /** Get the scene relative to the current `index` */
  get(index: number): Scene | null
  /** Get the scene for a new or existing path */
  get(path: string): Scene
  /** @internal */
  get(arg?: string | number) {
    let scene: Scene | undefined
    if (is.string(arg)) {
      noto(() => {
        scene = this.cache.get(arg)
        if (!scene) {
          scene = new Scene(this, arg)
          this.cache.set(arg, scene)
        }
      })
    } else {
      scene = this.visited[this.index + (arg || 0)]
    }
    return scene || null
  }

  /**
   * Render the given path (if not already the current path) and forget
   * any scenes we previously called `back` on.
   */
  visit(path: string) {
    noto(() => {
      if (this.path !== path) {
        const scene = this.get(path)
        if (scene.matches) {
          // Remove scenes that were visited after the current scene.
          this._truncate(this.index + 1)

          this.path = path
          this.index = this.visited.push(scene) - 1
        } else {
          // tslint:disable-next-line
          console.error(`Scene not found: "${path}"`)
        }
        this._clean()
      }
    })
  }

  /** Return to the previous scene. */
  return() {
    return noto(async () => {
      if (this.index > 0) {
        const prev = this.scene
        const curr = this.visited[--this.index]
        this.path = curr.path

        if (prev) {
          await prev.leave()
        }
        if (curr.isFocused) {
          await curr.enter()
        }
      }
    })
  }

  // TODO: find matching scene and clone it onto the stack?
  // push(path: string) {}

  // TODO: Clear history and goto given path
  // reset(path: string) {}

  private _clean() {
    this.cache.forEach(scene => scene.matches || this.cache.delete(scene.path))
  }

  /** Truncate the scene history */
  private _truncate(length: number) {
    const scenes = this.visited
    if (length < scenes.length) {
      for (let i = scenes.length - 1; i >= length; i--) {
        scenes[i].isMounted = false
      }
      scenes.length = length
    }
  }
}
