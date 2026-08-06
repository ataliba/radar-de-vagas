class EmpresaAlvo < ApplicationRecord
  before_validation { empresa = self.empresa&.strip; self.empresa = empresa if empresa }

  validates :empresa, presence: true, uniqueness: { case_sensitive: false }
end
