# Search, Global Lookup, & Universal Reference Framework
**Document Code:** ERP-SRH-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Search Architect & Information Retrieval Consultant  

---

## 1. Hybrid Search Architecture & Strategy

To support lightning-fast lookups (under 100ms response times) across millions of records, the ERP implements a **Hybrid Search Pipeline**:

```
                              ┌──────────────────────────────────────────────┐
                              │            Client Search Query               │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                 ┌───────────────────┴───────────────────┐
                                 ▼                                       ▼
                  ┌──────────────────────────────┐       ┌──────────────────────────────┐
                  │      Read-Through Cache      │       │    Elasticsearch Cluster     │
                  │        (Redis / TTL)         │       │  (Fuzzy & Semantic Search)   │
                  └──────────────┬───────────────┘       └──────────────┬───────────────┘
                                 │ Cache Miss                           │ Sync Index
                                 ▼                                      ▼
                  ┌─────────────────────────────────────────────────────────────┐
                  │              Primary PostgreSQL Database                    │
                  │      - TSVector Indices (English/Spanish stemming)          │
                  │      - Trigram Match (`pg_trgm`) for fuzzy names            │
                  └─────────────────────────────────────────────────────────────┘
```

### 1.1. Core Architectural Pillars
* **Database Full-Text Search (Initial Phase):** Uses PostgreSQL native `tsvector` and `tsquery` columns, paired with GIN indexes, to parse structured data without requiring secondary infrastructure.
* **Elasticsearch / OpenSearch (Enterprise Scale):** Search query requests are synchronized via a change-data-capture (CDC) pipeline to an external Elasticsearch cluster, offloading heavy calculations from the relational database.
* **Security-Aware Search:** Search queries are filtered at the database level by the user's active permissions, company scopes, and branch locks, preventing unauthorized access to sensitive financial records or user details.

---

## 2. Global Command Palette Experience

The global navigation uses a **Universal Command Palette** (triggered via `Ctrl + K` or `Cmd + K`):

* **Contextual Suggestions:** As the user types, suggestions appear categorized by context (e.g., Pages, Recent Inquiries, Active Events, Global Actions).
* **Keyboard Navigation:** Fully interactive using `Up`/`Down` arrow keys to highlight items, and `Enter` to execute actions.
* **Quick Actions:** Allows users to run actions directly from the bar (e.g. typing `/create-lead` or `/dispatch-order` opens the corresponding modal).

---

## 3. Database Schema Design (12 Tables DDL)

All search indexes, analytics logs, and favorites tables are grouped inside the `core` schema.

```sql
CREATE SCHEMA IF NOT EXISTS core;

-- 1. Search Indexes
CREATE TABLE core.search_indexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- e.g., "Event", "Customer", "Invoice"
    entity_id UUID NOT NULL,
    document_vector TSVECTOR NOT NULL, -- Pre-computed text tokens
    searchable_metadata JSONB NOT NULL, -- Key fields for quick rendering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_search_vector ON core.search_indexes USING GIN(document_vector);
CREATE INDEX idx_search_metadata ON core.search_indexes USING GIN(searchable_metadata);

-- 2. Search Documents (Raw Text Cache)
CREATE TABLE core.search_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_id UUID NOT NULL REFERENCES core.search_indexes(id) ON DELETE CASCADE,
    raw_content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Saved Searches
CREATE TABLE core.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    query_string VARCHAR(255) NOT NULL,
    filters_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_saved_search_user ON core.saved_searches(user_id);

-- 4. Search History
CREATE TABLE core.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    query_string VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_search_hist_user ON core.search_history(user_id, executed_at DESC);

-- 5. Favorites
CREATE TABLE core.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_user_fav_entity ON core.favorites(user_id, entity_type, entity_id);

-- 6. Pinned Entities
CREATE TABLE core.pinned_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Recent Entities
CREATE TABLE core.recent_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_recent_visit ON core.recent_entities(user_id, visited_at DESC);

-- 8. Search Synonyms
CREATE TABLE core.search_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    word VARCHAR(100) NOT NULL,
    synonyms_array VARCHAR(100)[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Search Tags
CREATE TABLE core.search_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    color_code VARCHAR(7) DEFAULT '#6b7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_tag_company_name ON core.search_tags(company_id, name);

-- 10. Entity References (Internal Links)
CREATE TABLE core.entity_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL, -- e.g., "Event"
    source_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- e.g., "Invoice"
    target_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, -- e.g. "BILLING_FOR", "LOGISTICS_FOR"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_entity_ref_source ON core.entity_references(source_type, source_id);
CREATE INDEX idx_entity_ref_target ON core.entity_references(target_type, target_id);

-- 11. Entity Relationships (Semantic links)
CREATE TABLE core.entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_a_type VARCHAR(50) NOT NULL,
    entity_a_id UUID NOT NULL,
    entity_b_type VARCHAR(50) NOT NULL,
    entity_b_id UUID NOT NULL,
    predicate VARCHAR(100) NOT NULL, -- e.g., "ASSIGNED_TO", "PROCURED_FROM"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Search Analytics
CREATE TABLE core.search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_string VARCHAR(255) NOT NULL,
    result_count INT NOT NULL DEFAULT 0,
    clicked_entity_type VARCHAR(50),
    clicked_entity_id UUID,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Query Parsing & AI Search Roadmap

As the ERP scales, the search framework evolves to support intelligent natural language queries:

* **Trigger S-001 (Keyword Mapping):** When a user enters a query, the system maps words to configured synonyms (e.g. searching "glassware" matches "tumbler", "wine glass", and "goblet").
* **AI-Assisted Semantic Search:** Integrates **pgvector** in PostgreSQL to store text embeddings for menu items and recipes. This enables semantic search capabilities—for example, searching "refreshing summer dessert" can return "Lemon Sorbet" even if the keywords don't match.
* **Typo Tolerance (Fuzzy Match):** Database search queries utilize pg_trgm indices to handle spelling mistakes (e.g. "samon" matches "salmon") with a configurable similarity threshold.
* **Sensitive Data Masking:** Financial amounts, payroll details, and customer tax numbers are masked in search previews unless the active user session has explicit view permissions for those fields.
