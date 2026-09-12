export const mockCompany = {
  name: "Fashion Prime Confecções",
  cnpj: "12.345.678/0001-99",
  plan: "Enterprise",
};

export const mockMarketplaces = [
  { id: "1", name: "Shopee Fashion", status: "active", lastSync: "Há 5 min", importedOrders: 1450, syncedProducts: 8500 },
  { id: "2", name: "Shopee Oficial", status: "active", lastSync: "Há 10 min", importedOrders: 890, syncedProducts: 9000 },
  { id: "3", name: "Mercado Livre Premium", status: "active", lastSync: "Há 2 min", importedOrders: 560, syncedProducts: 9500 },
  { id: "4", name: "TikTok Store", status: "warning", lastSync: "Há 1 hora", importedOrders: 100, syncedProducts: 2000 },
  { id: "5", name: "Temu", status: "error", lastSync: "Há 1 dia", importedOrders: 0, syncedProducts: 0 },
  { id: "6", name: "Shein", status: "active", lastSync: "Há 15 min", importedOrders: 0, syncedProducts: 1000 },
  { id: "7", name: "Kwai", status: "active", lastSync: "Há 20 min", importedOrders: 0, syncedProducts: 500 },
  { id: "8", name: "Nuvemshop", status: "active", lastSync: "Há 1 min", importedOrders: 0, syncedProducts: 10000 },
];

export const mockProducts = Array.from({ length: 100 }, (_, i) => ({
  id: `prod-${i}`,
  sku: `SKU-${10000 + i}`,
  name: i % 4 === 0 ? "Camiseta Oversized Preta" : i % 4 === 1 ? "Camiseta Oversized Branca" : i % 4 === 2 ? "Moletom Premium" : "Camiseta Anime Edition",
  category: i % 2 === 0 ? "Camisetas" : "Moletons",
  stock: Math.floor(Math.random() * 500),
  price: (Math.random() * 100 + 50).toFixed(2),
  marketplaces: ["Shopee Fashion", "Mercado Livre Premium"],
  image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop",
}));

const statuses = ["Pendente", "Conferido", "Enviado", "Cancelado"];
const carriers = ["Correios", "Loggi", "Total Express", "Mercado Envios"];

export const mockOrders = Array.from({ length: 50 }, (_, i) => ({
  id: `PED-${20000 + i}`,
  marketplace: mockMarketplaces[i % 4].name,
  store: mockCompany.name,
  client: `Cliente ${i + 1}`,
  date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0],
  status: statuses[Math.floor(Math.random() * statuses.length)],
  value: (Math.random() * 300 + 50).toFixed(2),
  carrier: carriers[Math.floor(Math.random() * carriers.length)],
}));
