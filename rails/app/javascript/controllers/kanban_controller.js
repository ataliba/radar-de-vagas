import { Controller } from "@hotwired/stimulus"

// Drag-and-drop dos cards entre colunas do Kanban. Salva via PATCH JSON em
// /vagas/:id/mover_kanban; se o servidor recusar, recarrega a página pra não
// deixar o board mostrando um estado que não foi gravado.
// Sem JS, o <select> de cada card faz o mesmo via submit normal.
export default class extends Controller {
  static targets = ["coluna", "card"]

  dragStart(event) {
    const card = event.currentTarget
    this.arrastando = card
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", card.dataset.vagaId)
    card.classList.add("dragging")
  }

  dragEnd(event) {
    event.currentTarget.classList.remove("dragging")
    this.colunaTargets.forEach((coluna) => coluna.classList.remove("dragover"))
    this.arrastando = null
  }

  dragOver(event) {
    if (!this.arrastando) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    event.currentTarget.classList.add("dragover")
  }

  dragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    event.currentTarget.classList.remove("dragover")
  }

  async drop(event) {
    event.preventDefault()
    const coluna = event.currentTarget
    coluna.classList.remove("dragover")

    const card = this.arrastando
    if (!card || card.closest("[data-kanban-target='coluna']") === coluna) return

    const origem = card.closest("[data-kanban-target='coluna']")
    coluna.querySelector(".col-empty")?.remove()
    coluna.prepend(card)
    card.querySelector("select").value = coluna.dataset.colunaId
    this.atualizarContagem(origem)
    this.atualizarContagem(coluna)

    const resposta = await fetch(card.dataset.url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": document.querySelector("meta[name='csrf-token']")?.content
      },
      body: JSON.stringify({ kanban_coluna_id: coluna.dataset.colunaId })
    }).catch(() => null)

    if (!resposta || !resposta.ok) window.location.reload()
  }

  // <select> do card: submit normal (redireciona de volta pro Kanban).
  mudarColuna(event) {
    event.currentTarget.form.requestSubmit()
  }

  atualizarContagem(coluna) {
    const contador = document.getElementById(`count-${coluna.dataset.colunaId}`)
    if (contador) contador.textContent = coluna.querySelectorAll(".card").length
  }
}
