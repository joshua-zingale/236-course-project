import { fetchQueryResult, fetchTableList } from "./db_api.js";
export {Relation, QueryBuilder, ColumnConstraint, ColumnConstrainer, Orderer}; 

class Relation extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

        /** @type {import("./db_api.js").Query | null} */
        this._query = null;
    }

    connectedCallback() {
        this.render();
    }


    get query() {
        return this._query;
    }

    get _page() {
        return Math.floor(this.query.offset / this.query.limit)
    }

    set query(value) {
        this.setQuery(value);
    }

    async setQuery(value) {
        this._query = value;
        await this.render();
    }

    async setPage(zero_index_number) {
        var query = this.query;
        query.offset = query.limit * zero_index_number;
        await this.setQuery(query);
    }

    async render() {
        if (this._query === null) {
            console.error("No query specified");
            return;
        }

        const res = await fetchQueryResult(this.query);

        const columnNames = this.query.columns && this.query.columns.length != 0
            ? this.query.columns
            : (await fetchTableList()).rows.find(row => row.table_name === this.query.table).columns.map(c => c.name);
        
        var rows;
        try {
            rows = res.rows.map(row => columnNames.map(column => row[column]));
        } catch {
            rows = [];
        }
        this.shadow.innerHTML = /*html*/`
        <style>
            :host {
                display:block;
                width: 100%;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-family: sans-serif;
                font-size: 0.8rem;
                color: var(--dark-color);
                letter-spacing: 1px;
                border-radius: 40px 40px 20px 20px;
                overflow: hidden;
            }

            caption {
                padding: 10px;
                font-weight: bold;
            }

            thead > tr {
                border-radius: 20px 20px 0px 0px;
            }

            thead,
            tfoot {
                color: var(--light-color);
                background-color: var(--primary-color);
            }

            tbody > tr:hover {
                background-color: var(--accent-color);
                color: var(--dark-color);
            }

            th,
            td {
                border: none;
                padding: 8px 10px;
            }

            tbody > tr:nth-of-type(even):not(:hover) {
                background-color: var(--primary-color-3);
                color: var(--dark-color);
            }
            tbody > tr:nth-of-type(odd):not(:hover) {
                background-color: var(--light-color);
                color: var(--dark-color);
            }
        </style>
        <table>
            <caption>${this.query.table}</caption>
            <tfoot>
                <button id="prevButton">prev</button><input id="setPage" type=text value="${this._page + 1}"><button id="nextButton">next</button>
            </tfoot>
            <thead>
            <tr>${columnNames.map(col =>`<th scope="col">${removeHTML(col)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${rows.map(row => `<tr>${row.map(datum => `<td>${datum}</td>`).join("")}</tr>`).join("")}
            </tbody>
        </table>
        `;
        
        this.shadow.querySelector("#prevButton").addEventListener("click", _ => this.setPage(this._page > 0 ? this._page - 1 : this._page));
        this.shadow.querySelector("#nextButton").addEventListener("click", _ => this.setPage(this._page + 1));
        this.shadow.querySelector("#setPage").addEventListener('keyup', e => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                const input = e.target;
                const pageNumber = Number(input.value);
                this.setPage(Math.max(pageNumber - 1, 0));
            }
        });
    }
}

class QueryBuilder extends HTMLElement {
    constructor() {
        super();
        
        this.shadow = this.attachShadow({mode: "open"});
        this._tables = null;

        this._tableSelector = document.createElement("select");
        this._tableSelector.setAttribute("name", "selectedTable");
        this._tableSelector.setAttribute("id", "tableSelector");

        /** @type {ColumnConstrainer[]} */
        this._columnConstrainers = [];

        /** @type {Orderer | null} */
        this._orderer = null;
        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(/*css*/`
            :host {
                display: block;
                padding: 10px;
                background-color: var(--primary-color-3);
                font-family: sans-serif;
                font-size: 0.8rem;
                color: var(--dark-color);
                letter-spacing: 1px;
                border-radius: 20px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }

            select#tableSelector {
                background-color: var(--primary-color);
                color: var(--light-color);
                border: none;
                padding: 8px 15px;
                font-weight: bold;
                font-size: 1rem;
                border-radius: 15px;
                margin-bottom: 15px;
                display: block;
                width: 100%;
                appearance: none; /* Hide default dropdown arrow */
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3e%3cpath fill='%23ffffff' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e"); /* Custom arrow */
                background-repeat: no-repeat;
                background-position: right 10px center;
                background-size: 8px 10px;
            }

            select#tableSelector option {
                color: var(--dark-color);
                background-color: var(--light-color);
            }

            ul {
                display: flex;
                flex-wrap: wrap;
                list-style-type: none;
                justify-content: left;
                padding: 0;
                margin: 0;
            }
            li {
                min-width: 25%;
                padding: 10px;
                box-sizing: border-box;
            }
        `);
        this.shadow.adoptedStyleSheets = [stylesheet]
    }

    get table() {
        return this._tableSelector.value;
    }

    /** @returns {import("./db_api.js").Query} */
    get query() {
        return {
            table: this.table,
            columns: [],
            limit: 10,
            constraints: [].concat(...this._columnConstrainers.map(cc => cc.constraints)),
            order: this._orderer?.orderings || [],
            offset: 0,
        }
    }

    async _updateTables() {
        const tableList = await fetchTableList();
        this._tables = {};
        tableList.rows.forEach(row => {
            var columnToTypeMap = {}
            row.columns.forEach(nameAndType => {
                columnToTypeMap[nameAndType.name] = nameAndType.type;
            });
            this._tables[row.table_name] = columnToTypeMap;
        });
    }

    async connectedCallback() {
        await this._updateTables();
        this._orderer = new Orderer();
        this.render();
    }

    _initializeTableSelector() {
        const defaultOption = document.createElement("option");
        defaultOption.innerText = "Select a table";
        defaultOption.toggleAttribute("disabled");
        defaultOption.toggleAttribute("selected");
        this._tableSelector.appendChild(defaultOption);
        for (const tableName in this._tables) {
            const option = document.createElement("option");
            option.value = tableName;
            option.text = tableName;
            this._tableSelector.appendChild(option);
        }
    }

    _getColumnConstrainers(tableName) {
        if (tableName == "") {
            console.error("table cannot be empty string");
            return;
        }
        const columnToTypeMap = this._tables[tableName];
        const columnConstrainers = [];
        for (const key in columnToTypeMap) {
            const ccner = new ColumnConstrainer(key, columnToTypeMap[key]);
            columnConstrainers.push(ccner);
        }
        return columnConstrainers;
    }

    _getColumnConstrainersContainer(columnConstrainers) {
        const ul = document.createElement("ul");

        columnConstrainers.forEach(cc => {
            const li = document.createElement("li");
            const columnNameSpan = document.createElement("span");
            columnNameSpan.innerHTML = cc.column;
            li.appendChild(columnNameSpan);
            li.appendChild(cc);
            ul.appendChild(li);
        });
        return ul;
    }

    render() {
        if (this._tables === null) {
            console.error("Invalid state");
            return;
        }

        this._initializeTableSelector();
        this.shadow.replaceChildren(this._tableSelector);

        this._tableSelector.addEventListener("change", _ => {
            this._columnConstrainers = this._getColumnConstrainers(this.table);
            const columns = Object.keys(this._tables[this.table]);
            this._orderer.columns = columns;
            this.shadow.replaceChildren(
                this._tableSelector,
                this._getColumnConstrainersContainer(this._columnConstrainers),
                this._orderer,
            );
        });        
    }
}

class Orderer extends HTMLElement {
    constructor(
        columns = []
    ) {
        super();
        this.shadow = this.attachShadow({mode: "open"});
        /** @type {HTMLUListElement} */
        this._ul = document.createElement("ul");
        this.columns = columns;

        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(/*css*/`
            :host {
                display: block;
                margin-top: 15px;
                padding: 10px;
                border-radius: 15px;
                background-color: var(--primary-color);
                color: var(--light-color);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            ul {
                display: flex;
                justify-content: center;
                list-style: none;
                padding: 0;
                margin: 0;
                gap: 15px;
            }
            li {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 5px 8px;
                cursor: pointer;
                border-radius: 8px;
                transition: background-color 0.1s, color 0.1s;
            }
            li:hover {
                background-color: var(--accent-color);
                color: var(--dark-color);
            }
            .orderer-indicator {
                font-size: 0.7rem;
                font-weight: bold;
                margin-bottom: 3px;
            }
            [descending] .orderer-indicator {
                color: var(--accent-color);
            }
            [descending]:hover .orderer-indicator {
                color: var(--light-color);
            }
    
            .sortable-ghost {
                opacity: 0.4;
                background-color: var(--light-color);
                color: var(--dark-color);
            }
            .sortable-chosen {
                background-color: var(--accent-color);
                color: var(--dark-color);
            }
            `);
            this.shadow.adoptedStyleSheets = [stylesheet];
    }

    /** @returns {import("./db_api.js").Ordering[]} */
    get orderings() {
        return this._lis.map(li => {
            return {
                column: li.getAttribute('data-column'),
                descending: li.hasAttribute("descending"),
            }
        });
    }

    get _lis() {
        return [...this._ul.children];
    }

    set _lis(value) {
        this._ul.replaceChildren(...value);
    }

    get columns() {
        return this._lis.map(li => li.textContent);
    }
    set columns(columns) {
        this._lis = columns.map(c => {
            const li = document.createElement("li");

            li.setAttribute('data-column', c);


            const indicator = document.createElement("span");
            indicator.classList.add('orderer-indicator');
            indicator.textContent = 'ASC';

            const text = document.createElement("span");
            text.textContent = c;

            li.append(indicator, text);
            
            li.addEventListener('click', this._handleLiClick);
            
            return li;
        });
    }

    _handleLiClick(event) {
        const li = event.currentTarget;
        const indicator = li.querySelector('.orderer-indicator');
        
        const isDescending = li.toggleAttribute("descending");
        
        if (isDescending) {
            indicator.textContent = 'DESC';
        } else {
            indicator.textContent = 'ASC';
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        Sortable.create(this._ul, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen'
        });
        this.shadow.replaceChildren(this._ul);
    }
}

class ColumnConstrainer extends HTMLElement {
    constructor(
        column = null,
        columnType = null,
    ) {
        super();
        this.shadow = this.attachShadow({mode: "open"});
        this._column = column;
        this._columnType = columnType;

        /** @type {ColumnConstraint[]} */
        this._columnConstraints = [];

        this._constraintsUl = document.createElement("ul");

        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(/*css*/`
            :host {
                display: block;
                border: 1px solid var(--primary-color);
                border-radius: 10px;
                padding: 10px;
                margin-top: 5px;
                background-color: var(--light-color);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }

            ul {
                list-style-type: none;
                padding-left: 0px;
                margin: 0;
            }

            li {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
            }

            button.removalButton {
                background-color: var(--accent-color);
                color: var(--dark-color);
                border: none;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                padding: 0;
                line-height: 1;
                font-weight: bold;
                cursor: pointer;
                margin-right: 5px;
                transition: background-color 0.1s;
            }

            button.removalButton:hover {
                background-color: var(--primary-color);
                color: var(--light-color);
            }

            #addConstraint {
                background-color: var(--primary-color);
                color: var(--light-color);
                border: none;
                border-radius: 5px;
                padding: 3px 8px;
                font-weight: bold;
                float: right;
                cursor: pointer;
                transition: background-color 0.1s;
                margin-top: 5px;
            }
            #addConstraint:hover {
                background-color: var(--accent-color);
                color: var(--dark-color);
            }
        `);
        this.shadow.adoptedStyleSheets = [stylesheet];
    }

    get column() {
        return this._column;
    }

    set column(value) {
        this._column = value;
    }

    get columnType() {
        return this._columnType;
    }

    set columnType(value) {
        this._columnType = value;
    }

    /**@returns {import("./db_api.js").Constraint[]} */
    get constraints() {
        return this._columnConstraints.map(columnConstraint=>columnConstraint.constraint)
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this._constraintsUl.replaceChildren(
            ...this._columnConstraints.map(columnConstraint => {
                const li = document.createElement("li");
                const removalButton = document.createElement("button");
                removalButton.classList = ["removalButton"];
                removalButton.innerText = "-";
                removalButton.onclick = _ => {
                    li.remove();
                    this._columnConstraints = this._columnConstraints.filter(cc => cc !== columnConstraint);
                };
                li.append(removalButton, columnConstraint);
                return li
            }));

        const addConstraintButton = document.createElement("button");
        addConstraintButton.setAttribute("id", "addConstraint");
        addConstraintButton.innerText = "+";
        addConstraintButton.addEventListener("click", _ => {
            const constraint = new ColumnConstraint(this.column, this.columnType);
            this._columnConstraints.push(constraint);
            this.render();
        });

        this.shadow.replaceChildren(this._constraintsUl, addConstraintButton);
    }

}

class ColumnConstraint extends HTMLElement {

    static _generalOperators = new Set([ "=", "!=", ">", "<"]);

    static _typeSpecificOperatorMap = {
        "text": new Set(["like", "not like"]),
    };

    constructor(
        column = null,
        columnType = null,
    ) {
        super();
        this.shadow = this.attachShadow({mode: "open"});
        this._column = column;
        this._columnType = columnType;
        this._argumentInput = null;
        this._operatorSelector = null;

        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(/*css*/`
            :host {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            select, input[type="text"] {
                padding: 4px 8px;
                border: 1px solid var(--primary-color-3);
                border-radius: 5px;
                font-size: 0.8rem;
                font-family: sans-serif;
            }

            select {
                background-color: var(--primary-color-3);
            }
        `);
        this.shadow.adoptedStyleSheets = [stylesheet];
    }

    get column() {
        return this._column;
    }

    set column(value) {
        this._column = value;
    }

    get columnType() {
        return this._columnType;
    }

    set columnType(value) {
        this._columnType = value;
    }

    get operator() {
        return this._operatorSelector?.value || "=";
    }

    get argument() {
        return this._argumentInput?.value || "";
    }

    /**@returns {import("./db_api.js").Constraint} */
    get constraint() {
        return {
            operator: this.operator,
            argument: this.argument,
            column: this.column
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (this._argumentInput === null) {
            this._operatorSelector = getSelect(ColumnConstraint._generalOperators.union(ColumnConstraint._typeSpecificOperatorMap[this.columnType] || new Set()), "operator");
            this._argumentInput = document.createElement("input");
            this._argumentInput.type = "text";
            this._argumentInput.setAttribute("name", "argument");
        }
        this.shadow.replaceChildren(this._operatorSelector, this._argumentInput);
    }

}

function getSelect(options, name) {
    const selector = document.createElement("select");
    selector.setAttribute("name", name)

    options.forEach(option => {
        const op = document.createElement("option");
        op.innerText = option;
        op.value = option;
        selector.appendChild(op);
    });
    return selector;
}

function removeHTML(text) {
    const decoder = document.createElement("div");
    decoder.textContent = text;
    return decoder.textContent || "";
}
