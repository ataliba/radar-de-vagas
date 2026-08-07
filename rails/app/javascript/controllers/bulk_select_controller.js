import { Controller } from "@hotwired/stimulus"

// Checkbox "selecionar todas" + botão de enviar, na tela de vagas.
export default class extends Controller {
  static targets = ["all", "item", "submit", "count"]

  connect() {
    this.refresh()
  }

  toggleAll() {
    this.itemTargets.forEach((checkbox) => { checkbox.checked = this.allTarget.checked })
    this.refresh()
  }

  refresh() {
    const checked = this.itemTargets.filter((checkbox) => checkbox.checked).length
    this.submitTargets.forEach((button) => { button.disabled = checked === 0 })
    if (this.hasCountTarget) this.countTarget.textContent = checked
    if (this.hasAllTarget) this.allTarget.checked = checked > 0 && checked === this.itemTargets.length
  }
}
