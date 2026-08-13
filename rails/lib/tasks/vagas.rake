namespace :vagas do
  desc "Importa vagas_final.json, presence_combined.json e inhire_new_companies.json do pipeline do maninho"
  task import: :environment do
    source_dir = Pathname.new(
      ENV.fetch("VAGAS_SOURCE_DIR") { Rails.root.join("..", "busca-vagas-gupy-inhire", "busca_vagas") }
    )

    vagas_criadas = vagas_atualizadas = 0

    ler_json(source_dir, "vagas_final.json").each do |item|
      # Gupy/InHire têm link estável — dedup por ele. Sólides embute no link
      # um slug derivado do título (cosmético, só pra rota abrir), que muda
      # se a empresa editar o título; dedup por id_externo (o id puro da
      # plataforma) pra não duplicar a vaga quando isso acontecer.
      vaga = if item["id_externo"].present?
        Vaga.find_or_initialize_by(plataforma: item["plataforma"], id_externo: item["id_externo"])
      else
        Vaga.find_or_initialize_by(link: item["link"])
      end
      novo = vaga.new_record?

      vaga.assign_attributes(
        empresa: nome_empresa_limpo(item),
        plataforma: item["plataforma"],
        link: item["link"],
        id_externo: item["id_externo"],
        na_lista: item["na_lista"],
        cargo_categoria: item["cargo_categoria"],
        titulo_vaga: item["titulo_vaga"],
        tipo: item["tipo"],
        local: item["local"],
        nome_na_plataforma: item["nome_na_plataforma"],
        publicado: item["publicado"],
        alerta: item["alerta"],
        detectado_em: item["detectado_em"]
      )

      vaga.save!
      novo ? vagas_criadas += 1 : vagas_atualizadas += 1
    end

    presencas_upsert = ler_json(source_dir, "presence_combined.json")
      .uniq { |item| item["empresa"] }
      .map do |item|
        {
          empresa: item["empresa"],
          gupy: item["gupy"],
          gupy_url: item["gupy_url"],
          inhire: item["inhire"],
          inhire_url: item["inhire_url"],
          inhire_vagas_total: item["inhire_vagas_total"],
          solides: item["solides"],
          solides_vagas: item["solides_vagas"],
          created_at: Time.current,
          updated_at: Time.current
        }
      end
    Presenca.upsert_all(presencas_upsert, unique_by: :index_presencas_on_empresa) if presencas_upsert.any?

    novas_upsert = ler_json(source_dir, "inhire_new_companies.json")
      .uniq { |item| item["empresa"] }
      .map do |item|
        {
          empresa: item["empresa"],
          vagas_total: item["vagas_total"],
          url: item["url"],
          created_at: Time.current,
          updated_at: Time.current
        }
      end
    EmpresaNova.upsert_all(novas_upsert, unique_by: :index_empresa_novas_on_empresa) if novas_upsert.any?

    puts "Vagas: #{vagas_criadas} criadas, #{vagas_atualizadas} atualizadas."
    puts "Presenças: #{presencas_upsert.size}. Empresas novas InHire: #{novas_upsert.size}."
  end

  def ler_json(dir, filename)
    path = dir.join(filename)
    raise "Arquivo não encontrado: #{path}" unless File.exist?(path)

    JSON.parse(File.read(path))
  end

  # Gupy usa o "careerPageName" (texto livre que a empresa escreve) como nome —
  # às vezes é slogan de campanha de RH ("#SejaVeriter", "VENHA SER #SANGUELARANJA 🧡🚀")
  # em vez do nome da empresa. Nesses casos, deriva o nome do subdomínio da URL da vaga.
  def nome_empresa_limpo(item)
    bruto = item["empresa"].to_s
    return bruto unless bruto.include?("#")

    subdominio = item["link"].to_s[%r{https?://([a-z0-9-]+)\.(?:gupy\.io|inhire\.app)}i, 1]
    return bruto unless subdominio

    subdominio.split(/[-_]/).map(&:capitalize).join(" ")
  end

  desc "Corrige links de vagas Sólides gravados antes da 0.2.3 (subdomínio .solides.jobs ou /vagas/:id sem slug)"
  task fix_solides_links: :environment do
    corrigidas = apagadas = 0

    Vaga.where(plataforma: "Solides").find_each do |vaga|
      id_vaga =
        vaga.link[%r{solides\.jobs/vacancies/(\d+)}, 1] ||
        vaga.link[%r{vagas\.solides\.com\.br/vagas/(\d+)\z}, 1]

      next unless id_vaga

      novo_link = "https://vagas.solides.com.br/vaga/#{id_vaga}/#{slugify(vaga.titulo_vaga)}"
      next if novo_link == vaga.link

      # A mesma vaga pode ter sido gravada mais de uma vez sob formatos de
      # link diferentes ao longo de versões antigas (índice único não pegava
      # porque as strings eram diferentes). Se o link normalizado já existe
      # em outra linha com status/detecção iguais, é duplicata — apaga a
      # antiga. Se divergir, não mexe (checar manual).
      existente = Vaga.find_by(link: novo_link)
      if existente
        if existente.status == vaga.status && existente.detectado_em == vaga.detectado_em
          vaga.destroy!
          apagadas += 1
        end
        next
      end

      vaga.update!(link: novo_link)
      corrigidas += 1
    end

    preenchidos = 0
    Vaga.where(plataforma: "Solides", id_externo: nil).find_each do |vaga|
      id_vaga = vaga.link[%r{vagas\.solides\.com\.br/vaga/(\d+)/}, 1]
      next unless id_vaga

      vaga.update!(id_externo: id_vaga)
      preenchidos += 1
    end

    puts "Links Sólides corrigidos: #{corrigidas}. Duplicatas removidas: #{apagadas}. id_externo preenchido: #{preenchidos}."
  end

  # Mesma lógica do slugify() de busca-vagas-gupy-inhire/busca_vagas/lib.js —
  # o slug é cosmético (a página carrega pelo id), qualquer valor não-vazio serve.
  def slugify(titulo)
    titulo.to_s.unicode_normalize(:nfd).gsub(/[̀-ͯ]/, "")
      .downcase.gsub("&", " and ").gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "")
      .presence || "vaga"
  end
end
