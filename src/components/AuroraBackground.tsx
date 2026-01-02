const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
      
      {/* Aurora layers */}
      <div 
        className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[120px] animate-aurora"
        style={{ background: 'radial-gradient(ellipse, hsl(187 100% 55% / 0.15) 0%, transparent 70%)' }}
      />
      <div 
        className="absolute top-20 right-1/4 w-[500px] h-[350px] rounded-full blur-[100px] animate-aurora"
        style={{ 
          background: 'radial-gradient(ellipse, hsl(280 100% 70% / 0.12) 0%, transparent 70%)',
          animationDelay: '-5s'
        }}
      />
      <div 
        className="absolute top-40 left-1/3 w-[400px] h-[300px] rounded-full blur-[80px] animate-aurora"
        style={{ 
          background: 'radial-gradient(ellipse, hsl(160 84% 50% / 0.1) 0%, transparent 70%)',
          animationDelay: '-10s'
        }}
      />
      
      {/* Stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-foreground/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AuroraBackground;
