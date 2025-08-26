import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

const MushroomCard = () => {
  return (
    <Card className="w-full max-w-sm pt-0">
      <CardHeader className="!p-0 relative h-60">
        <Link href="/product/" className="block w-full h-full">
          <Image
            src="/images/landing-page-image.jpg"
            alt="Oyster"
            fill
            className="object-cover rounded-t-xl"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        </Link>
      </CardHeader>

      <CardContent className="p-4 grid gap-4">
        <Link href="/product/" className="grid gap-4">
          <div>
            <h2 className="text-sm font-medium">Oyster</h2>
            <div className="text-xs">Pleurotus ostreatus</div>
          </div>
          <div className="flex-between gap-4">
            <p>Oyster mushroom grows in rainforests etc.</p>
            <Button asChild>
              <Link href="/profile">Grow</Link>
            </Button>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default MushroomCard;
