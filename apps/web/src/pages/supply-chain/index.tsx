import {
  Package, TrendingDown, AlertTriangle, BarChart3, Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useSupplyDashboard, useSupplyItems,
  usePurchaseOrders, useContracts,
} from '@/services/supply-chain.service';

function DashboardTab() {
  const { data: dashboard } = useSupplyDashboard();
  const d = dashboard;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{d?.totalItems ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Valor em Estoque</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              R$ {(d?.totalValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Abaixo do Ponto de Pedido</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{d?.belowReorderPoint ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Vencendo em 30 dias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{d?.expiringSoon ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {d?.byCategory && d.byCategory.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle className="text-white">Estoque por Categoria</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">Categoria</TableHead>
                  <TableHead className="text-zinc-400 text-right">Itens</TableHead>
                  <TableHead className="text-zinc-400 text-right">Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.byCategory.map((c) => (
                  <TableRow key={c.category} className="border-zinc-800">
                    <TableCell className="text-white">{c.category}</TableCell>
                    <TableCell className="text-right text-zinc-300">{c.count}</TableCell>
                    <TableCell className="text-right text-zinc-300">{c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ItemsTab() {
  const { data } = useSupplyItems();
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Itens de Estoque</h3>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Novo Item</Button>
      </div>
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Codigo</TableHead>
                <TableHead className="text-zinc-400">Categoria</TableHead>
                <TableHead className="text-zinc-400 text-right">Estoque</TableHead>
                <TableHead className="text-zinc-400 text-right">Ponto Pedido</TableHead>
                <TableHead className="text-zinc-400">Curva ABC</TableHead>
                <TableHead className="text-zinc-400">Validade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-8">Nenhum item cadastrado</TableCell>
                </TableRow>
              ) : items.map((item) => (
                <TableRow key={item.id} className="border-zinc-800">
                  <TableCell className="text-white font-medium">{item.name}</TableCell>
                  <TableCell className="text-zinc-400">{item.code}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                  <TableCell className={`text-right ${item.currentStock <= item.reorderPoint ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                    {item.currentStock}
                  </TableCell>
                  <TableCell className="text-right text-zinc-400">{item.reorderPoint}</TableCell>
                  <TableCell>
                    <Badge variant={item.abcCurve === 'A' ? 'destructive' : item.abcCurve === 'B' ? 'secondary' : 'outline'}>
                      {item.abcCurve}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('pt-BR') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab() {
  const { data } = usePurchaseOrders();
  const orders = data?.data ?? [];
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING_APPROVAL: { label: 'Aguardando Aprovacao', variant: 'secondary' },
    APPROVED: { label: 'Aprovado', variant: 'default' },
    RECEIVED: { label: 'Recebido', variant: 'outline' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Pedidos de Compra</h3>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Novo Pedido</Button>
      </div>
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Fornecedor</TableHead>
                <TableHead className="text-zinc-400">Itens</TableHead>
                <TableHead className="text-zinc-400 text-right">Valor Total</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum pedido</TableCell>
                </TableRow>
              ) : orders.map((o) => (
                <TableRow key={o.id} className="border-zinc-800">
                  <TableCell className="text-zinc-400 font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-white">{o.supplierId.slice(0, 8)}</TableCell>
                  <TableCell className="text-zinc-300">{o.items.length} itens</TableCell>
                  <TableCell className="text-right text-white">R$ {o.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell><Badge variant={statusMap[o.status]?.variant ?? 'outline'}>{statusMap[o.status]?.label ?? o.status}</Badge></TableCell>
                  <TableCell className="text-zinc-400">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ContractsTab() {
  const { data } = useContracts();
  const contracts = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Contratos</h3>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Novo Contrato</Button>
      </div>
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">Contraparte</TableHead>
                <TableHead className="text-zinc-400">Tipo</TableHead>
                <TableHead className="text-zinc-400">No Contrato</TableHead>
                <TableHead className="text-zinc-400">Vigencia</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhum contrato</TableCell>
                </TableRow>
              ) : contracts.map((c) => (
                <TableRow key={c.id} className="border-zinc-800">
                  <TableCell className="text-white font-medium">{c.counterpartyName}</TableCell>
                  <TableCell className="text-zinc-400">{c.counterpartyType}</TableCell>
                  <TableCell className="text-zinc-400">{c.contractNumber}</TableCell>
                  <TableCell className="text-zinc-400">
                    {new Date(c.startDate).toLocaleDateString('pt-BR')} — {new Date(c.endDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'ACTIVE' ? 'default' : c.status === 'EXPIRING_SOON' ? 'secondary' : 'destructive'}>
                      {c.status === 'ACTIVE' ? 'Ativo' : c.status === 'EXPIRING_SOON' ? 'Vencendo' : c.status === 'EXPIRED' ? 'Expirado' : c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupplyChainPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Cadeia de Suprimentos</h1>
        <p className="text-zinc-400 mt-1">Estoque, compras e contratos</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Estoque</TabsTrigger>
          <TabsTrigger value="orders">Compras</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="items"><ItemsTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="contracts"><ContractsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
