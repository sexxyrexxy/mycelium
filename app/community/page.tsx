import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BigCard } from "@/components/shared/chart/bigCard";

export default function Markets() {
  return (
    <div className="p-6">
      <Tabs defaultValue="overview" className="w-full">
        {/* Row of buttons */}
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="Oysters">Oysters</TabsTrigger>
          <TabsTrigger value="stocks">Shiitakes</TabsTrigger>
          <TabsTrigger value="crypto">Buttons</TabsTrigger>
          <TabsTrigger value="indices">Maitakes</TabsTrigger>
          <TabsTrigger value="commodities">Enokis</TabsTrigger>
          <TabsTrigger value="currencies">Siu</TabsTrigger>
        </TabsList>

        {/* Content for each tab */}
        <TabsContent value="overview">
          <BigCard
            name="LuxFutureInvest"
            image="/images/landing-page-image.jpg" // place your image in /public
            returnPct={21.61}
            copiers={201}
            featured
          />
        </TabsContent>

        <TabsContent value="stocks">
          <Card>
            <CardHeader>
              <CardTitle>Stocks</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Stock movers, charts, news...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <CardTitle>Crypto</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Crypto-specific stuff goes here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indices">
          <Card>
            <CardHeader>
              <CardTitle>Indices</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Indices content...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ...repeat for other triggers */}
      </Tabs>
    </div>
  );
}
