// Dados iniciais (mock) — espelham o seed da reciclaja-api, com alguns extras
// para deixar listas, filtros, ranking, avaliações e loja mais ricos na demo.

export function makeSeed() {
  return {
    seq: { usuario: 3, ponto: 6, coleta: 12, notif: 3, msg: 0, avaliacao: 5, resgate: 0 },

    usuarios: [
      { id: 1, nome: 'Ana Recicladora', email: 'ana@email.com',   senha: 'senha123', telefone: '11999990001', cidade: 'São Paulo',      criado_em: '2026-05-20' },
      { id: 2, nome: 'Bruno Verde',     email: 'bruno@email.com', senha: 'senha123', telefone: '11999990002', cidade: 'São Paulo',      criado_em: '2026-05-22' },
      { id: 3, nome: 'Carla Eco',       email: 'carla@email.com', senha: 'senha123', telefone: '21999990003', cidade: 'Rio de Janeiro', criado_em: '2026-05-25' },
    ],

    pontos: [
      { id: 1, nome: 'EcoPonto Centro',        endereco: 'Praça da Sé, 100',        cidade: 'São Paulo',      latitude: -23.5505, longitude: -46.6333, materiais: ['papel', 'plástico', 'vidro'],               horario: 'Seg-Sex 8h-18h',       ativo: true },
      { id: 2, nome: 'Coleta Vila Madalena',   endereco: 'Rua Harmonia, 250',       cidade: 'São Paulo',      latitude: -23.5546, longitude: -46.6896, materiais: ['eletrônicos', 'pilhas'],                     horario: 'Seg-Sáb 9h-17h',       ativo: true },
      { id: 3, nome: 'ReciclaRio Copacabana',  endereco: 'Av. Atlântica, 1500',     cidade: 'Rio de Janeiro', latitude: -22.9711, longitude: -43.1822, materiais: ['metal', 'plástico'],                         horario: 'Todos os dias 7h-19h', ativo: true },
      { id: 4, nome: 'Recicla Pinheiros',      endereco: 'Rua dos Pinheiros, 1000', cidade: 'São Paulo',      latitude: -23.5645, longitude: -46.6996, materiais: ['papel', 'vidro', 'metal', 'papelão'],        horario: 'Seg-Sex 8h-20h',       ativo: true },
      { id: 5, nome: 'EcoStation Tijuca',      endereco: 'Rua Conde de Bonfim, 500',cidade: 'Rio de Janeiro', latitude: -22.9249, longitude: -43.2336, materiais: ['papel', 'plástico', 'eletrônicos', 'óleo'],  horario: 'Seg-Sáb 8h-18h',       ativo: true },
      { id: 6, nome: 'Verde Vale Campinas',    endereco: 'Av. Norte-Sul, 800',      cidade: 'Campinas',       latitude: -22.9056, longitude: -47.0608, materiais: ['vidro', 'metal', 'pilhas'],                  horario: 'Seg-Sex 9h-17h',       ativo: false },
    ],

    coletas: [
      { id: 1,  usuario_id: 1, ponto_id: 1, material: 'papel',       quantidade_kg: 5.5, status: 'concluida', data_agendada: '2026-06-01' },
      { id: 2,  usuario_id: 1, ponto_id: 2, material: 'eletrônicos', quantidade_kg: 2.0, status: 'agendada',  data_agendada: '2026-06-18' },
      { id: 3,  usuario_id: 2, ponto_id: 1, material: 'vidro',       quantidade_kg: 8.0, status: 'agendada',  data_agendada: '2026-06-20' },
      { id: 4,  usuario_id: 3, ponto_id: 3, material: 'plástico',    quantidade_kg: 3.2, status: 'concluida', data_agendada: '2026-06-03' },
      { id: 5,  usuario_id: 1, ponto_id: 4, material: 'papelão',     quantidade_kg: 6.0, status: 'concluida', data_agendada: '2026-06-05' },
      { id: 6,  usuario_id: 1, ponto_id: 1, material: 'vidro',       quantidade_kg: 4.0, status: 'concluida', data_agendada: '2026-05-28' },
      { id: 7,  usuario_id: 2, ponto_id: 4, material: 'metal',       quantidade_kg: 3.5, status: 'concluida', data_agendada: '2026-06-02' },
      { id: 8,  usuario_id: 2, ponto_id: 3, material: 'plástico',    quantidade_kg: 2.5, status: 'concluida', data_agendada: '2026-06-08' },
      { id: 9,  usuario_id: 3, ponto_id: 5, material: 'óleo',        quantidade_kg: 1.5, status: 'concluida', data_agendada: '2026-06-06' },
      { id: 10, usuario_id: 3, ponto_id: 5, material: 'papel',       quantidade_kg: 7.0, status: 'concluida', data_agendada: '2026-06-09' },
      { id: 11, usuario_id: 1, ponto_id: 2, material: 'pilhas',      quantidade_kg: 0.8, status: 'concluida', data_agendada: '2026-06-11' },
      { id: 12, usuario_id: 3, ponto_id: 3, material: 'metal',       quantidade_kg: 5.0, status: 'agendada',  data_agendada: '2026-06-22' },
    ],

    avaliacoes: [
      { id: 1, ponto_id: 1, usuario_id: 2, usuario_nome: 'Bruno Verde',     nota: 5, comentario: 'Atendimento rápido e bem organizado!',          em: '2026-06-02' },
      { id: 2, ponto_id: 1, usuario_id: 3, usuario_nome: 'Carla Eco',       nota: 4, comentario: 'Ótimo ponto, só estava com fila no sábado.',     em: '2026-06-05' },
      { id: 3, ponto_id: 3, usuario_id: 1, usuario_nome: 'Ana Recicladora', nota: 5, comentario: 'Aceitam vários materiais, super recomendo.',     em: '2026-06-04' },
      { id: 4, ponto_id: 4, usuario_id: 2, usuario_nome: 'Bruno Verde',     nota: 4, comentario: 'Bem localizado e horário amplo.',               em: '2026-06-06' },
      { id: 5, ponto_id: 2, usuario_id: 1, usuario_nome: 'Ana Recicladora', nota: 5, comentario: 'Perfeito para eletrônicos e pilhas.',           em: '2026-06-07' },
    ],

    resgates: [],
    chats: {},

    notificacoes: [
      { id: 1, usuario_id: 1, tipo: 'coleta',     icone: '♻️', texto: 'Coleta de papel concluída no EcoPonto Centro. +44 EcoPontos!', em: '2026-06-01T10:00:00', lida: true },
      { id: 2, usuario_id: 1, tipo: 'lembrete',   icone: '📅', texto: 'Lembrete: coleta de eletrônicos agendada na Vila Madalena.', em: '2026-06-12T09:00:00', lida: false },
      { id: 3, usuario_id: 1, tipo: 'recompensa', icone: '🎁', texto: 'Você já tem EcoPontos para resgatar recompensas na loja!', em: '2026-06-13T18:30:00', lida: false },
    ],
  };
}
