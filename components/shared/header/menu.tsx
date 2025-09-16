import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EllipsisVertical, ShoppingCart, UserIcon } from "lucide-react";
import { Kavoon } from "next/font/google";
const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

const Menu = () => {
  return (
    <div className="flex justify-end gap-3">
      <nav className="hidden md:flex w-full max-w-x gap-1">
        <Button asChild variant="ghost">
          <Link
            href="/about"
            className={` text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl`}
          >
            About
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href="/"
            className={` text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl`}
          >
            Grow
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href="/portfolio"
            className={` text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl`}
          >
            Portfolio
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link
            href="/community"
            className={` text-[#564930] hover:!text-[#C89E4D] hover:bg-transparent text-xl`}
          >
            Community
          </Link>
        </Button>
        {/* <Button asChild variant="ghost">
          <Link href="/about">About Us</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/cart">Our Impact</Link>
        </Button> */}
        <Button
          asChild
          className="bg-[#564930] hover:bg-[#C89E4D] text-white font-bold ml-4 rounded-full"
        >
          <Link href="/auth" className={` text-[#564930] text-xl`}>
            Login
          </Link>
        </Button>
      </nav>
    </div>
  );
};

export default Menu;
