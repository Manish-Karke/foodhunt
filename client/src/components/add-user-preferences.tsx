"use client";
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import Image from "next/image";
import { toast } from "sonner";
import { updateUserPreferences } from "@/redux/reducerSlices/userSlice";
import { useRouter } from "next/navigation";

import { MultiSelect } from "./multi-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useAppSelector } from "@/redux/store";

// Define types
interface Product {
  name: string;
  category?: {
    emoji?: string;
  };
}

interface MultiSelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function transformProducts(products: Product[]): MultiSelectOption[] {
  const uniqueItemsMap = new Map<string, MultiSelectOption>();

  products.forEach((product) => {
    const name = product.name;
    const emoji = product.category?.emoji || "food";

    if (!uniqueItemsMap.has(name)) {
      uniqueItemsMap.set(name, {
        value: name,
        label: name,
        icon: () => <span className="text-lg">{emoji}</span>,
      });
    }
  });

  return Array.from(uniqueItemsMap.values());
}

export default function UserPreferences() {
  const dispatch = useDispatch();
  const router = useRouter();

  // Redux state
  const currentUserPreferences = useAppSelector(
    (state) => state.user.userPreferences
  );
  const userId = useAppSelector((state) => state.user._id);

  // Local state
  const [products, setProducts] = useState<Product[]>([]);
  const [favouriteProducts, setFavouriteProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formattedProducts, setFormattedProducts] = useState<
    MultiSelectOption[]
  >([]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/products`
        );
        setProducts(response.data);
        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching products:", err);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Sync Redux preferences → local state
  useEffect(() => {
    if (currentUserPreferences && Array.isArray(currentUserPreferences)) {
      setFavouriteProducts(currentUserPreferences);
    }
  }, [currentUserPreferences]);

  // Format for MultiSelect
  useEffect(() => {
    setFormattedProducts(transformProducts(products));
  }, [products]);

  // Submit preferences
  const handleNext = async () => {
    if (favouriteProducts.length === 0) {
      toast.error("Please select at least one favorite food.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/add-preferences`,
        { userPreferences: favouriteProducts }
      );

      dispatch(updateUserPreferences(favouriteProducts));
      toast.success("Preferences saved successfully!");
      router.push("/");
    } catch (err: unknown) {
      console.error("Error saving preferences:", err);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-lg text-gray-700">Loading products...</p>
      </div>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-lg text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-inter">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10">
        <Card className="w-full border-0">
          <CardHeader>
            <div className="flex w-full items-start gap-8">
              <Image
                src="/applogo.png"
                alt="App Logo"
                width={110}
                height={110}
                style={{ objectFit: "contain" }}
              />
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 -mb-1">
                  What kind of food do you like?
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-gray-600">
                  We&apos;ll personalize your recommendations.
                </CardDescription>
              </div>
            </div>

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          </CardHeader>

          <CardContent className="-mt-5">
            <MultiSelect
              options={formattedProducts}
              onValueChange={setFavouriteProducts}
              defaultValue={favouriteProducts}
              placeholder="Search and select your favorite foods..."
              animation={2}
              variant="default"
              maxCount={3}
              className="w-full"
            />
            <CardDescription className="mt-2 text-gray-600">
              You can select multiple items.
            </CardDescription>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleNext}
              disabled={isSubmitting || favouriteProducts.length === 0}
              className={`w-full py-3 px-6 rounded-full text-lg font-semibold text-white transition-all duration-300 ease-in-out
                ${
                  isSubmitting || favouriteProducts.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-400 hover:bg-orange-500 active:bg-orange-600 shadow-lg hover:shadow-xl"
                }`}
            >
              {isSubmitting ? "Saving..." : "Next"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
