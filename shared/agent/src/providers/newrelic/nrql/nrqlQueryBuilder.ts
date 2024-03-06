/**
 * Represents a query builder for constructing NRQL queries.
 */
export class NrqlQueryBuilder {
	private _selectFields: string | undefined;
	private _eventType: string | undefined;
	private _whereCondition: string[] = [];
	private _facetValue: string | undefined;
	private _sinceValue: string | undefined;
	private _limitValue: number | string | undefined;
	private _isTimeSeries: boolean | undefined;
	private _timeSeriesValue: string | undefined;

	/**
	 * Specifies the fields to select in the query.
	 * @param fields - The fields to select. Can be either a string or an array of strings.
	 * @returns The current instance of QueryBuilder.
	 */
	select(fields: string[] | string): NrqlQueryBuilder {
		if (Array.isArray(fields)) {
			fields = fields.join(",");
		}

		this._selectFields = fields;
		return this;
	}

	/**
	 * Specifies the event type to query from.
	 * @param eventType - The event type to query from.
	 * @returns The current instance of QueryBuilder.
	 */
	from(eventType: string[] | string): NrqlQueryBuilder {
		if (Array.isArray(eventType)) {
			eventType = eventType.join(",");
		}

		this._eventType = eventType;
		return this;
	}

	/**
	 * Specifies the condition for the WHERE clause in the query.
	 * @param condition - The condition for the WHERE clause.
	 * @returns The current instance of QueryBuilder.
	 */
	where(condition: string | undefined): NrqlQueryBuilder {
		if (condition) {
			this._whereCondition = [condition];
		}
		return this;
	}

	/**
	 * Adds an additional condition to the WHERE clause using the AND operator.
	 * @param condition - The additional condition to add.
	 * @returns The current instance of QueryBuilder.
	 * @throws An error if where() has not been called before calling and().
	 */
	and(condition: string | undefined): NrqlQueryBuilder {
		if (!this._whereCondition.length) {
			return this.where(condition);
		}
		if (condition) {
			this._whereCondition.push(condition!);
		}
		return this;
	}

	/**
	 * Specifies the facet for the query results.
	 * @param facet - The facet for the query results.
	 * @returns The current instance of QueryBuilder.
	 */
	facet(facet: string | undefined): NrqlQueryBuilder {
		if (facet) {
			this._facetValue = facet;
		}
		return this;
	}

	/**
	 * Specifies the limit for the query results.
	 * @param limit - The limit for the query results.
	 * @returns The current instance of QueryBuilder.
	 */
	limit(limit: number | string | undefined): NrqlQueryBuilder {
		if (limit != null) {
			this._limitValue = limit;
		}
		return this;
	}

	/**
	 * Specifies the time range for the query. Omit "ago".
	 * @param since - The time range for the query.
	 * @returns The current instance of QueryBuilder.
	 */
	since(since: string | undefined): NrqlQueryBuilder {
		if (since) {
			this._sinceValue = since;
		}
		return this;
	}

	/**
	 * Specifies timeseries
	 * @param timeseries
	 * @returns The current instance of QueryBuilder.
	 */
	timeseries(unit: string | undefined = undefined): NrqlQueryBuilder {
		this._isTimeSeries = true;
		this._timeSeriesValue = unit;
		return this;
	}

	/**
	 * Creates a copy of the current query builder.
	 * @returns A new instance of QueryBuilder with the same state as the current instance.
	 */
	copy() {
		const newBuilder = new NrqlQueryBuilder();
		Object.assign(newBuilder, this);
		return newBuilder;
	}

	/**
	 * Builds the NRQL query string based on the current state of the query builder.
	 * @returns The NRQL query string.
	 */
	build(): string {
		let query = `SELECT ${this._selectFields} FROM ${this._eventType}`;
		if (this._whereCondition.length) {
			query += ` WHERE ${this._whereCondition.join(" AND ")}`;
		}
		if (this._facetValue != null) {
			query += ` FACET ${this._facetValue}`;
		}
		if (this._limitValue != null) {
			query += ` LIMIT ${this._limitValue}`;
		}
		if (this._sinceValue != null) {
			query += ` SINCE ${this._sinceValue} AGO`;
		}
		if (this._isTimeSeries) {
			query += ` TIMESERIES`;
			if (this._timeSeriesValue != null) {
				query += ` ${this._timeSeriesValue}`;
			}
		}
		return query;
	}
}
