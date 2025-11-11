"use client";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  role: Yup.string()
    .oneOf(["user", "seller"], "Please select a valid role")
    .required("Role is required"),
  phoneNumber: Yup.string()
    .matches(/^[+]?[\d\s-()]+$/, "Invalid phone number format")
    .min(10, "Phone number must be at least 10 digits")
    .required("Phone number is required"),
  location: Yup.string()
    .min(3, "Location must be at least 3 characters")
    .required("Location is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/\d/, "Password must contain at least one number")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

const Register = () => {
  const router = useRouter();

  const initialValues = {
    email: "",
    role: "",
    phoneNumber: "",
    location: "",
    password: "",
    confirmPassword: "",
  };

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/register`,
        values
      );

      toast.success(data?.message || "Registration successful!");
      setSubmitting(false);
      router.push("/login");
    } catch (error: unknown) {
      // Narrowing the error
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          "Registration failed. Please try again.";
        toast.error(message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="flex items-center justify-center space-x-2 mb-4 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Image src="/applogo.png" alt="App Logo" width={200} height={200} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
          <p className="text-muted-foreground">Join our food community today</p>
        </div>

        {/* Registration Form */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  {/* Your fields */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full ..."
                  >
                    {isSubmitting ? "Creating Account..." : "Sign Up"}
                  </Button>
                </Form>
              )}
            </Formik>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
