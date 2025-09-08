import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EllipsisVertical, ShoppingCart, UserIcon } from "lucide-react";

const Menu = () => {
  return (
    <div className="flex justify-end gap-3">
      <nav className="hidden md:flex w-full max-w-x gap-1">
        <Button asChild variant="ghost">
          <Link href="/home">Home</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/portfolio">Portfolio</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/community">Community</Link>
        </Button>
        {/* <Button asChild variant="ghost">
          <Link href="/about">About Us</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/cart">Our Impact</Link>
        </Button> */}
        <Button asChild>
          <Link href="/auth">Login</Link>
        </Button>
      </nav>
    </div>
  );
};

export default Menu;
