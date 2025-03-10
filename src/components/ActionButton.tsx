
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  icon,
}) => {
  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };

  const sizeStyles = {
    sm: "h-9 px-3 text-xs rounded-md",
    md: "h-10 px-4 py-2 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10 rounded-full p-0 flex items-center justify-center",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && (
        <span className={size !== "icon" ? "mr-2" : ""}>{icon}</span>
      )}
      {children}
    </motion.button>
  );
};

export default ActionButton;
