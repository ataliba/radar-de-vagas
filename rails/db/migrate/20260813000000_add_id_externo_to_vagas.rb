class AddIdExternoToVagas < ActiveRecord::Migration[8.1]
  def change
    # Id nativo da plataforma (ex.: id numérico da Sólides), pra dedup estável.
    # Pra Gupy/InHire o "link" já é estável e serve de chave; a Sólides
    # precisou de um slug derivado do título na URL, que pode variar se o
    # título mudar — dedup por link sozinho reabriria o mesmo bug de
    # duplicata resolvido pelo vagas:fix_solides_links.
    add_column :vagas, :id_externo, :string
    add_index :vagas, [ :plataforma, :id_externo ], unique: true, where: "id_externo IS NOT NULL"
  end
end
