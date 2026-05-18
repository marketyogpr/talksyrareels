/**
 * Lightweight Supabase REST API Helper for Cloudflare Workers
 * No heavy npm dependencies required
 */

export class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url;
    this.anonKey = anonKey;
    this.headers = {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      'apikey': anonKey,
    };
  }

  /**
   * Execute a SELECT query
   */
  async from(table) {
    return new QueryBuilder(this.url, this.headers, table, 'SELECT');
  }

  /**
   * Execute an INSERT query
   */
  async insert(table, data) {
    const response = await fetch(
      `${this.url}/rest/v1/${table}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      }
    );
    return this.handleResponse(response);
  }

  /**
   * Execute an UPDATE query
   */
  async update(table, data, filters) {
    let url = `${this.url}/rest/v1/${table}`;
    const filterEntries = Object.entries(filters);
    
    if (filterEntries.length > 0) {
      const filterQuery = filterEntries
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      url += `?${filterQuery}`;
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Execute a DELETE query
   */
  async delete(table, filters) {
    let url = `${this.url}/rest/v1/${table}`;
    const filterEntries = Object.entries(filters);
    
    if (filterEntries.length > 0) {
      const filterQuery = filterEntries
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      url += `?${filterQuery}`;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.headers,
    });
    return this.handleResponse(response);
  }

  async handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        error: data,
      };
    }
    return { data, error: null };
  }
}

/**
 * Query Builder for chainable queries
 */
class QueryBuilder {
  constructor(url, headers, table, method) {
    this.url = url;
    this.headers = headers;
    this.table = table;
    this.method = method;
    this.filters = [];
    this.limit_ = null;
    this.offset_ = null;
    this.select_ = '*';
    this.order_ = null;
  }

  select(columns) {
    this.select_ = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push(`${column}=eq.${value}`);
    return this;
  }

  neq(column, value) {
    this.filters.push(`${column}=neq.${value}`);
    return this;
  }

  gt(column, value) {
    this.filters.push(`${column}=gt.${value}`);
    return this;
  }

  gte(column, value) {
    this.filters.push(`${column}=gte.${value}`);
    return this;
  }

  lt(column, value) {
    this.filters.push(`${column}=lt.${value}`);
    return this;
  }

  lte(column, value) {
    this.filters.push(`${column}=lte.${value}`);
    return this;
  }

  ilike(column, value) {
    this.filters.push(`${column}=ilike.${value}`);
    return this;
  }

  in(column, values) {
    const valString = values.join(',');
    this.filters.push(`${column}=in.(${valString})`);
    return this;
  }

  limit(count) {
    this.limit_ = count;
    return this;
  }

  offset(count) {
    this.offset_ = count;
    return this;
  }

  order(column, ascending = true) {
    this.order_ = `${column}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  async execute() {
    let url = `${this.url}/rest/v1/${this.table}?select=${this.select_}`;

    // Add filters
    if (this.filters.length > 0) {
      url += '&' + this.filters.join('&');
    }

    // Add limit
    if (this.limit_) {
      url += `&limit=${this.limit_}`;
    }

    // Add offset
    if (this.offset_) {
      url += `&offset=${this.offset_}`;
    }

    // Add order
    if (this.order_) {
      url += `&order=${this.order_}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        error: data,
      };
    }
    return { data, error: null };
  }
}

/**
 * Create a Supabase client instance
 */
export function createClient(url, anonKey) {
  return new SupabaseClient(url, anonKey);
}

export default {
  createClient,
  SupabaseClient,
};
