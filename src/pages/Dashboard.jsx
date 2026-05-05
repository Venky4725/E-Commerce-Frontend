import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ShoppingBag, User, ShoppingCart } from "lucide-react";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Welcome back{user?.username ? `, ${user.username}` : ""}!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex flex-col items-center py-8 gap-3">
            <ShoppingBag size={32} className="text-blue-500" />
            <p className="font-semibold text-gray-700">Browse Products</p>
            <Link to="/">
              <Button size="sm" variant="outline">Go to Shop</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-8 gap-3">
            <ShoppingCart size={32} className="text-green-500" />
            <p className="font-semibold text-gray-700">My Cart</p>
            <Link to="/cart">
              <Button size="sm" variant="outline">View Cart</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-8 gap-3">
            <User size={32} className="text-purple-500" />
            <p className="font-semibold text-gray-700">My Profile</p>
            <Link to="/profile">
              <Button size="sm" variant="outline">View Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
