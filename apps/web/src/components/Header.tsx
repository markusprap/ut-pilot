import React from 'react';
import { BrainCircuit, Sun, Moon, LogOut, User, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  resetApp: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  userName?: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ resetApp, isDarkMode, toggleTheme, userName, onLogout }) => {
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 transition-colors duration-300">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={resetApp}
        >
          <img
            src={isDarkMode ? "/logo-ut-putih.png" : "/logo-ut-biru.png"}
            alt="UT Logo"
            className="h-10 w-auto object-contain transition-all duration-300"
          />
          <div className="hidden sm:block"> {/* Hide text on mobile if logo includes text, or adjust layout */}
            <h1 className="text-xl font-bold text-foreground leading-none">UT-Pilot <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1 align-top">Beta 3</span></h1>
            <p className="text-xs text-muted-foreground font-medium">AI Learning Partner</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {userName && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div role="button" className="flex items-center gap-2 pl-4 border-l border-border cursor-pointer outline-none">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-sm font-bold text-foreground pointer-events-none">
                      {userName}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pointer-events-none">
                      Mahasiswa
                    </span>
                  </div>
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Mahasiswa Universitas Terbuka
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;