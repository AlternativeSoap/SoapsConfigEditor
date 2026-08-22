import { completionStatus, selectedCompletionIndex, setSelectedCompletion } from '@codemirror/autocomplete'
import { ViewPlugin, type ViewUpdate } from '@codemirror/view'

const SCROLL_EDGE_PX = 20

function optionIndexFromLi(li: Element): number | null {
  const m = /-(\d+)$/.exec(li.id)
  return m ? +m[1] : null
}

function findCompletionList(view: import('@codemirror/view').EditorView): HTMLUListElement | null {
  const root = view.dom.getRootNode()
  const lists = root.querySelectorAll('.cm-tooltip-autocomplete ul')
  for (const node of lists) {
    if (!(node instanceof HTMLUListElement)) continue
    const rect = node.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return node
  }
  return null
}

/**
 * Loads the next/previous page of autocomplete options when the user scrolls
 * to the edge of the list (replaces clicking the "···" rows).
 */
export function completionScrollLoadMore() {
  return ViewPlugin.fromClass(
    class {
      private list: HTMLUListElement | null = null
      private onScroll = () => this.handleScroll()

      update(update: ViewUpdate) {
        if (completionStatus(update.state) !== 'active') {
          this.detach()
          return
        }

        const list = findCompletionList(update.view)
        if (!list) {
          this.detach()
          return
        }

        if (list !== this.list) {
          this.detach()
          this.list = list
          list.addEventListener('scroll', this.onScroll, { passive: true })
        }
      }

      private handleScroll() {
        const list = this.list
        const view = this.view
        if (!list || !view || completionStatus(view.state) !== 'active') return

        const selected = selectedCompletionIndex(view.state)

        if (
          list.classList.contains('cm-completionListIncompleteBottom') &&
          list.scrollTop + list.clientHeight >= list.scrollHeight - SCROLL_EDGE_PX
        ) {
          const items = list.querySelectorAll('li[id]')
          const last = items[items.length - 1]
          if (!last) return
          const lastIndex = optionIndexFromLi(last)
          if (lastIndex == null) return
          const loadIndex = lastIndex + 1
          if (selected !== loadIndex) {
            view.dispatch({ effects: setSelectedCompletion(loadIndex) })
          }
          return
        }

        if (list.classList.contains('cm-completionListIncompleteTop') && list.scrollTop <= SCROLL_EDGE_PX) {
          const first = list.querySelector('li[id]')
          if (!first) return
          const firstIndex = optionIndexFromLi(first)
          if (firstIndex == null || firstIndex <= 0) return
          const loadIndex = firstIndex - 1
          if (selected !== loadIndex) {
            view.dispatch({ effects: setSelectedCompletion(loadIndex) })
          }
        }
      }

      private detach() {
        if (this.list) {
          this.list.removeEventListener('scroll', this.onScroll)
          this.list = null
        }
      }

      destroy() {
        this.detach()
      }
    },
  )
}
