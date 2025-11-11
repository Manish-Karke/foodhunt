"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Minus, Plus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { logoutUser } from "@/redux/reducerSlices/userSlice";
import MapSidebar from "./map-sidebar";
import axios from "axios";
import { toast } from "sonner";
import { useAppSelector } from "@/redux/store";

interface MapProps {
  position: [number, number];
  zoom?: number;
}

/* ----------  Types for the API payloads  ---------- */
interface Category {
  _id?: string;
  name: string;
  emoji?: string;
  product_ids?: string[];
}

interface SellerCoords {
  lat: number;
  lng: number;
}

interface Seller {
  coords?: SellerCoords;
}

interface Product {
  _id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  availableQuantity: number;
  quantity: number;
  category?: { emoji?: string };
  sellerId?: Seller;
}

/* ----------  Emoji icon helper  ---------- */
const createEmojiIcon = (
  emoji: string = "🍔",
  discountPercentage: number = 0
) => {
  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center">
        <div class="discount-text" style="font-size:18px;text-align:center;font-weight:bold;">
          ${discountPercentage.toFixed(0)}% OFF
        </div>
        <div class="emoji-container" style="font-size:48px;text-align:center;line-height:1;position:relative;">
          ${emoji}
          <span class="ripple"></span>
        </div>
      </div>
      <style>
        .emoji-container{position:relative;display:inline-block}
        .ripple{
          position:absolute;top:50%;left:50%;width:20px;height:20px;
          background:rgb(255,77,0);border-radius:50%;
          transform:translate(-50%,-50%);animation:ripple-effect 1.2s infinite;z-index:-1
        }
        @keyframes ripple-effect{
          0%{transform:translate(-50%,-50%) scale(0);opacity:1}
          100%{transform:translate(-50%,-50%) scale(5);opacity:0}
        }
        .discount-text{
          animation:pulse-text 1.5s infinite ease-in-out;color:red
        }
        @keyframes pulse-text{
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.3)}
        }
      </style>`,
    className: "custom-emoji-icon",
    iconSize: [60, 60],
    iconAnchor: [30, 60],
    popupAnchor: [0, -50],
  });
};

/* ----------  Main component  ---------- */
const MapComponent: React.FC<MapProps> = ({ position, zoom = 12 }) => {
  const dispatch = useDispatch();
  const { _id, isLoggedIn, userPreferences } = useAppSelector(
    (state) => state.user
  );

  const [productList, setProductList] = useState<Product[]>([]);
  const [productsOfSelectedCategory, setProductsOfSelectedCategory] = useState<
    Category[]
  >([]);
  const [foodCategories, setFoodCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  /* ----------  API helpers (wrapped in useCallback) ---------- */
  const fetchProducts = useCallback(async () => {
    if (!userPreferences?.length || !_id) return;

    const allFetched: Product[] = [];
    for (const pref of userPreferences) {
      try {
        const { data }: { data: Product[] } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/products?name=${pref}&userId=${_id}`
        );
        const withQty = data.map((p) => ({ ...p, quantity: 1 }));
        allFetched.push(...withQty);
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    }
    setProductList(allFetched);
  }, [_id, userPreferences]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data }: { data: Category[] } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/categories`
      );
      setFoodCategories(data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  const fetchProductsByProductIds = useCallback(async (ids: string[] = []) => {
    if (!ids.length) {
      setProductList([]);
      return;
    }
    try {
      const { data }: { data: Product[] } = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/product-search?productIds=${ids.join(",")}`
      );
      const withQty = data.map((p) => ({ ...p, quantity: 1 }));
      setProductList(withQty);
    } catch (err) {
      console.error("Error fetching products by IDs:", err);
    }
  }, []);

  const fetchProductChip = useCallback(
    async (catId = "") => {
      try {
        const { data }: { data: Category[] } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/product-chips?categoryId=${catId}`
        );
        if (data?.length) {
          const first = data[0];
          await fetchProductsByProductIds(first.product_ids ?? []);
          setSelectedCategory(first);
        }
        setProductsOfSelectedCategory(data);
      } catch (err) {
        console.error("Error fetching product chips:", err);
      }
    },
    [fetchProductsByProductIds]
  );

  /* ----------  Initial load ---------- */
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchProductChip();
  }, [fetchProducts, fetchCategories, fetchProductChip]);

  /* ----------  Handlers ---------- */
  const handleLogout = () => dispatch(logoutUser());

  const updateProduct = async (item: Product) => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/products/update/${item._id}`,
        { availableQuantity: item.availableQuantity - item.quantity }
      );
    } catch (err) {
      console.error("Failed to update product:", err);
    }
  };

  const handlePlaceOrder = async (item: Product) => {
    const payload = {
      bookedById: _id,
      productId: item._id,
      quantity: item.quantity,
      price: item.quantity * item.discountedPrice,
      paymentMethod: "Cash",
    };

    try {
      const { data }: { data: { message?: string } } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/orders`,
        payload
      );
      toast.success(data.message ?? "Order placed!");
      await updateProduct(item);
      fetchProducts();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to place order";
      toast.error(message);
    }
  };

  const handleCategoryClick = (category: Category) => {
    fetchProductsByProductIds(category.product_ids ?? []);
    setSelectedCategory(category);
    setIsSearchFocused(false);
  };

  const handleSidebarCategoryClick = (category: Category) => {
    fetchProductChip(category._id);
  };

  const handleDecrement = (clicked: Product) => {
    setProductList((prev) =>
      prev.map((p) =>
        p._id === clicked._id && p.quantity > 1
          ? { ...p, quantity: p.quantity - 1 }
          : p
      )
    );
  };

  const handleIncrement = (clicked: Product) => {
    setProductList((prev) =>
      prev.map((p) =>
        p._id === clicked._id && p.quantity < p.availableQuantity
          ? { ...p, quantity: p.quantity + 1 }
          : p
      )
    );
  };

  /* ----------  Render ---------- */
  return (
    <div className="relative w-full h-screen">
      <MapSidebar
        foodCategories={foodCategories}
        onCategoryClick={handleSidebarCategoryClick}
      />

      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {productList.map((item) => {
          const lat = item.sellerId?.coords?.lat;
          const lng = item.sellerId?.coords?.lng;
          if (lat === undefined || lng === undefined) return null;

          const icon = createEmojiIcon(
            item.category?.emoji ?? "🍔",
            item.discountPercentage
          );

          return (
            <Marker position={[lat, lng]} icon={icon} key={item._id}>
              <Popup maxWidth={300}>
                {/* ----- Popup Card ----- */}
                <Card className="py-2 my-2 w-full bg-white shadow-lg border border-gray-200">
                  <CardContent className="py-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-gray-800 flex-1">
                        Available{" "}
                        <span
                          className="text-white p-1 rounded-sm"
                          style={{ backgroundColor: "#FAA617" }}
                        >
                          {item.availableQuantity}
                        </span>{" "}
                        stocks of {item.name}
                      </h3>
                    </div>

                    {item.availableQuantity === 0 && (
                      <h4 className="text-red-500 mb-1">
                        {item.name} is currently not available
                      </h4>
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 line-through">
                          रु {item.originalPrice}
                        </span>
                        <span
                          className="text-lg font-bold"
                          style={{ color: "#FAA617" }}
                        >
                          रु {item.discountedPrice}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecrement(item)}
                          style={{
                            borderColor: "#FAA617",
                            color: "#FAA617",
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center font-semibold text-lg">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIncrement(item)}
                          style={{
                            borderColor: "#FAA617",
                            color: "#FAA617",
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-2 text-right font-semibold">
                  Total:{" "}
                  <span style={{ color: "#FAA617" }}>
                    रु {item.discountedPrice * item.quantity}
                  </span>
                </div>

                <Button
                  className="mt-2 w-full"
                  style={{ backgroundColor: "#FAA617", color: "white" }}
                  disabled={item.availableQuantity < 1}
                  onClick={() => handlePlaceOrder(item)}
                >
                  Place Order
                </Button>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ----- Category Chips ----- */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/3 z-[1000] w-[1000px]">
        <ScrollArea className="w-full whitespace-nowrap rounded-full">
          <div className="flex space-x-2 p-2">
            {productsOfSelectedCategory.map((cat, idx) => (
              <Button
                key={idx}
                variant={
                  selectedCategory?.name === cat.name ? "default" : "outline"
                }
                className={`flex items-center space-x-2 rounded-full px-4 py-2 ${
                  selectedCategory?.name === cat.name
                    ? "bg-orange-400 text-white"
                    : "bg-blue-400 text-white border-0"
                }`}
                onClick={() => handleCategoryClick(cat)}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </Button>
            ))}
          </div>
          <ScrollBar
            orientation="horizontal"
            className="h-2 bg-white rounded-full hidden"
          />
        </ScrollArea>
      </div>

      {/* ----- Search Input ----- */}
      <div className="absolute top-4 bg-orange-400 rounded-full p-1 left-1/8 transform -translate-x-1/2 z-[1000] w-[300px]">
        <Input
          className="text-white border-0 rounded-full outline-none shadow-none focus-visible:ring-0"
          type="search"
          placeholder="Search offers for your meal"
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        {isSearchFocused && (
          <Card className="absolute top-12 left-1/2 transform -translate-x-1/2 w-[300px] bg-white shadow-lg z-[1001]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Suggested Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {foodCategories.map((cat, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  className="w-full justify-start text-left mb-1 hover:bg-[#f85000] hover:text-white"
                  onClick={() => handleCategoryClick(cat)}
                >
                  <span className="mr-2">{cat.emoji}</span>
                  <span>{cat.name}</span>
                </Button>
              ))}
            </CardContent>
            <CardFooter className="p-2">
              <Button
                variant="outline"
                className="w-full"
                style={{ borderColor: "#f85000", color: "#f85000" }}
                onClick={() => setIsSearchFocused(false)}
              >
                Close
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* ----- Auth Buttons ----- */}
      <div className="absolute top-6 right-35 z-[1000]">
        {isLoggedIn ? (
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-orange-600 hover:bg-orange-400 text-blue-50"
          >
            Logout
          </Button>
        ) : (
          <div className="flex space-x-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="bg-black hover:bg-[#c74021] text-blue-50"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="bg-[#faa617] text-white">
                Sign up
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ----- Avatar Dropdown ----- */}
      <div className="absolute top-4 right-20 z-[1000]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-12 w-12 cursor-pointer">
              <AvatarImage
                src="https://img.freepik.com/premium-vector/young-man-avatar-character-due-avatar-man-vector-icon-cartoon-illustration_1186924-4438.jpg"
                alt="User"
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="z-[1100]">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuItem>Subscription</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MapComponent;
