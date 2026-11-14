# Roda no `db:prepare` de uma instalação nova (banco vazio: carrega o schema.rb
# e depois este arquivo — as migrations não rodam). Idempotente: pode rodar de
# novo com `bin/rails db:seed` sem duplicar nada. Ver app/services/dados_iniciais.rb.
DadosIniciais.carregar!
