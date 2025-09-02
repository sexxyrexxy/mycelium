import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

// Define props interface
interface MushroomCardProps {
  img: string;
  name: string;
  species: string;
  description?: string;
  href?: string;
}

const MushroomCard: React.FC<MushroomCardProps> = ({
  img,
  name,
  species,
  description,
  href = "/product/",
}) => {
  return (
    <Card className="w-full max-w-sm pt-0">
      <CardHeader className="!p-0 relative h-60">
        <Link href={href} className="block w-full h-full">
          <Image
            src={img}
            alt={name}
            fill
            className="object-cover rounded-t-xl"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        </Link>
      </CardHeader>

      <CardContent className="p-4 grid gap-4">
        <Link href={href} className="grid gap-4">
          <div>
            <h2 className="text-sm font-medium">{name}</h2>
            <div className="text-xs">{species}</div>
          </div>
          <div className="flex justify-between items-center gap-4">
            <p className="text-xs">{description || `Info about ${name}`}</p>
            <Button asChild>
              <Link href={href}>Grow</Link>
            </Button>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default MushroomCard;
