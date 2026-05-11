import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ShoppingBag, User, ShoppingCart, ClipboardList } from "lucide-react";
import useAuthStore from "../store/authStore";

const Dashboard = () => {
  const user = useAuthStore((s) => s.user);

  const tiles = [
    { icon: <ShoppingBag size={32} className="text-blue-500" />,   label: "Browse Products", to: "/",        btn: "Go to Shop"     },
    { icon: <ShoppingCart size={32} className="text-green-500" />, label: "My Cart",         to: "/cart",    btn: "View Cart"      },
    { icon: <ClipboardList size={32} className="text-orange-500" />, label: "My Orders",     to: "/orders",  btn: "View Orders"    },
    { icon: <User size={32} className="text-purple-500" />,        label: "My Profile",      to: "/profile", btn: "View Profile"   },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Welcome back{user?.username ? `, ${user.username}` : ""}!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiles.map(({ icon, label, to, btn }) => (
          <Card key={to} className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="flex flex-col items-center py-8 gap-3">
              {icon}
              <p className="font-semibold text-gray-700 dark:text-gray-200">{label}</p>
              <Link to={to}>
                <Button size="sm" variant="outline">{btn}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
