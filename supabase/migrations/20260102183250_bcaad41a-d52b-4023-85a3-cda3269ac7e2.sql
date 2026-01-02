-- Create enum for server status
CREATE TYPE public.server_status AS ENUM ('online', 'warning', 'offline');

-- Create servers table
CREATE TABLE public.servers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status server_status NOT NULL DEFAULT 'offline',
    cpu INTEGER NOT NULL DEFAULT 0 CHECK (cpu >= 0 AND cpu <= 100),
    memory INTEGER NOT NULL DEFAULT 0 CHECK (memory >= 0 AND memory <= 100),
    disk INTEGER NOT NULL DEFAULT 0 CHECK (disk >= 0 AND disk <= 100),
    ip TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (servers are viewable by everyone)
CREATE POLICY "Servers are publicly viewable" 
ON public.servers 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_servers_updated_at
    BEFORE UPDATE ON public.servers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for servers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;

-- Insert sample server data
INSERT INTO public.servers (name, location, status, cpu, memory, disk, ip) VALUES
    ('AURORA-PROD-01', 'US East (N. Virginia)', 'online', 45, 62, 38, '192.168.1.101'),
    ('AURORA-PROD-02', 'EU West (Ireland)', 'online', 72, 58, 45, '192.168.1.102'),
    ('AURORA-DEV-01', 'US West (Oregon)', 'warning', 89, 78, 67, '192.168.1.103'),
    ('AURORA-STAGING', 'Asia Pacific (Tokyo)', 'online', 34, 45, 52, '192.168.1.104'),
    ('AURORA-BACKUP', 'EU Central (Frankfurt)', 'offline', 0, 0, 23, '192.168.1.105'),
    ('AURORA-EDGE-01', 'South America (São Paulo)', 'online', 56, 41, 29, '192.168.1.106');