import Image from "next/image";
import Link from "next/link";
import Menu from "./menu";
import { APP_NAME } from "@/lib/constants";
import { Kavoon } from "next/font/google";
const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

const Header = () => {
  return (
    <header className="w-full ">
      <div className="wrapper flex-between">
        <div className="flex-start">
          <Link href="/home" className="flex-start">
            <Image
              src="/images/mushroom-logo.png"
              alt={APP_NAME}
              width={48}
              height={48}
              priority={true}
            />
            <span
              className={`hidden lg:block ml-3 text-2xl font-bold ${kavoon.className} hover:!text-[#C89E4D]`}
              style={{ color: "#564930" }}
            >
              {APP_NAME}
            </span>
          </Link>
        </div>

        <Menu />
      </div>
    </header>
  );
};

export default Header;
