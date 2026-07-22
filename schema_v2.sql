-- =========================================================
-- National IT Hardware Customer Intelligence Platform
-- Database Schema V2 (Master Customer Record Architecture)
-- =========================================================

-- 1. Create Master Businesses Table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS master_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR NOT NULL,
    brand_name VARCHAR,
    gstin VARCHAR UNIQUE,
    primary_phone VARCHAR,
    is_whatsapp BOOLEAN DEFAULT FALSE,
    primary_email VARCHAR,
    primary_website VARCHAR,
    google_place_id VARCHAR UNIQUE,
    rating NUMERIC(3, 1),
    reviews_count INTEGER DEFAULT 0,
    national_ai_score INTEGER DEFAULT 50,
    quality_tier VARCHAR DEFAULT 'Medium', -- 'Enterprise', 'High', 'Medium', 'Low'
    aggregated_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Business Locations Table (Spatial & Bounding Data)
CREATE TABLE IF NOT EXISTS business_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES master_businesses(id) ON DELETE CASCADE,
    state VARCHAR NOT NULL,
    district VARCHAR,
    city VARCHAR NOT NULL,
    market_area VARCHAR,
    full_address TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Business Classifications Table (Customer Types & Product Categories)
CREATE TABLE IF NOT EXISTS business_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES master_businesses(id) ON DELETE CASCADE,
    customer_type VARCHAR NOT NULL,
    product_category VARCHAR NOT NULL,
    verified_by_ai BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Scans Audit & Intelligence Logs Table
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    market_area VARCHAR,
    radius_km NUMERIC(5, 2) DEFAULT 5.0,
    customer_types JSONB,
    product_categories JSONB,
    status VARCHAR DEFAULT 'running', -- 'running', 'completed', 'failed'
    total_discovered INTEGER DEFAULT 0,
    master_records_updated INTEGER DEFAULT 0,
    master_records_created INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_master_businesses_updated_at
    BEFORE UPDATE ON master_businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_scans_updated_at
    BEFORE UPDATE ON scans
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- Performance & Identity Matching Indexes
CREATE INDEX IF NOT EXISTS idx_mb_primary_phone ON master_businesses(primary_phone);
CREATE INDEX IF NOT EXISTS idx_mb_company_name ON master_businesses(company_name);
CREATE INDEX IF NOT EXISTS idx_mb_google_place_id ON master_businesses(google_place_id);
CREATE INDEX IF NOT EXISTS idx_mb_gstin ON master_businesses(gstin);

CREATE INDEX IF NOT EXISTS idx_bl_business_id ON business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_bl_state ON business_locations(state);
CREATE INDEX IF NOT EXISTS idx_bl_city ON business_locations(city);
CREATE INDEX IF NOT EXISTS idx_bl_market_area ON business_locations(market_area);

CREATE INDEX IF NOT EXISTS idx_bc_business_id ON business_classifications(business_id);
CREATE INDEX IF NOT EXISTS idx_bc_customer_type ON business_classifications(customer_type);
CREATE INDEX IF NOT EXISTS idx_bc_product_category ON business_classifications(product_category);
