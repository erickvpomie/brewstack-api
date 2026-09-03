export type Unit = {
  id: string;
  name: string;
  symbol: string;
};

const units: Unit[] = [
  { id: 'pz', name: 'Pieza', symbol: 'pz' },
  { id: 'kg', name: 'Kilogramo', symbol: 'kg' },
  { id: 'g', name: 'Gramo', symbol: 'g' },
  { id: 'l', name: 'Litro', symbol: 'L' },
  { id: 'ml', name: 'Mililitro', symbol: 'ml' },
  { id: 'caja', name: 'Caja', symbol: 'caja' },
  { id: 'paquete', name: 'Paquete', symbol: 'paq' },
  { id: 'bolsa', name: 'Bolsa', symbol: 'bolsa' },
  { id: 'botella', name: 'Botella', symbol: 'botella' },
  { id: 'docena', name: 'Docena', symbol: 'doc' },
  { id: 'porcion', name: 'Porción', symbol: 'porción' },
];

export const listUnits = async (): Promise<Unit[]> => units.map((unit) => ({ ...unit }));
