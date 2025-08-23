import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

const MushroomCard = () => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="p-0 items-center">
        <Link href={`/product/`}>
          <Image
            src="/images/landing-page-image.jpg"
            alt="Oyster"
            width={300}
            height={300}
          ></Image>
        </Link>
      </CardHeader>
      <CardContent className="p-4 grid gap-4">
        <Link href={`/product/`} className="grid gap-4">
          <h2 className="text-sm font-medium">Oyster</h2>
          <div className="flex-between gap-4">
            <p>Oyster mushroom grows in rainforests etc.</p>
            <Button asChild>
              <Link href="/profile">Read more</Link>
            </Button>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default MushroomCard;
