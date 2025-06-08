import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, TrendingUp, Search, User, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useState } from "react";

const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, loading, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/", icon: null },
    { name: "Resume Analyzer", href: "/resume-analyzer", icon: FileText },
    { name: "Career Paths", href: "/career-paths", icon: TrendingUp },
    { name: "Job Search", href: "/job-search", icon: Search },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">ResumeMatch AI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition
                  border
                  ${isActive(item.href)
                    ? "bg-blue-600 text-white border-blue-600 shadow"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"}
                `}
                style={{
                  boxShadow: isActive(item.href) ? "0 2px 8px 0 rgba(37, 99, 235, 0.10)" : undefined,
                }}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Desktop User Account Area */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            {loading ? null : user ? (
              <>
                <Link to="/profile" className="hidden sm:inline-flex">
                  <Avatar className="h-8 w-8 cursor-pointer border border-blue-200 shadow">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition shadow"
                  onClick={signOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/signin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition shadow"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    size="sm"
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow font-semibold"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="px-6 py-4 flex flex-col h-full">
                  {/* Logo in Drawer */}
                  <Link to="/" className="flex items-center space-x-2 mb-6" onClick={() => setDrawerOpen(false)}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">ResumeMatch AI</span>
                  </Link>
                  {/* Navigation */}
                  <nav className="flex flex-col gap-2 mb-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                          isActive(item.href)
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                        }`}
                        onClick={() => setDrawerOpen(false)}
                      >
                        {item.icon && <item.icon className="h-5 w-5" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </nav>
                  <div className="flex-1" />
                  {/* Account Actions */}
                  <div className="flex flex-col gap-2 border-t pt-4">
                    {loading ? null : user ? (
                      <>
                        <Link to="/profile" onClick={() => setDrawerOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start mb-1">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setDrawerOpen(false);
                            signOut();
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link to="/signin" onClick={() => setDrawerOpen(false)}>
                          <Button variant="outline" className="w-full justify-start mb-1">
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/signup" onClick={() => setDrawerOpen(false)}>
                          <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                            Sign Up
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
