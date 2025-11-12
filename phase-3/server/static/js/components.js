import { fetchQueryResult, fetchTableList } from "./db_api.js";
export {Relation, QueryBuilder, ColumnConstraint, ColumnConstrainer, Orderer}; 

class Relation extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

        /** @type {Query | null} */
        this._query = null;
    }

    connectedCallback() {
        this.render();
    }


    get query() {
        return this._query;
    }

    set query(value) {
        this.setQuery(value);
    }

    async setQuery(value) {
        this._query = value;
        await this.render();
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
        const rows = res.rows.map(row => columnNames.map(column => row[column]));
        this.shadow.innerHTML = /*html*/`
        <style>
            :host {
                display:block;
            }

            table {
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
            <thead>
            <tr>${columnNames.map(col =>`<th scope="col">${removeHTML(col)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${rows.map(row => `<tr>${row.map(datum => `<td>${datum}</td>`).join("")}</tr>`).join("")}
            </tbody>
        </table>
        `;        
    }
}

class QueryBuilder extends HTMLElement {
    constructor() {
        super();
        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(/*css*/`
            :host {
                display: block;
            }
            ul {
                display: flex;
                flex-wrap: wrap;
                list-style-type: none;
            }
            li {
                margin: 10px;
            }
        `);
        this.shadow = this.attachShadow({mode: "open"});
        this.shadow.adoptedStyleSheets = [stylesheet]
        this._tables = null;

        this._tableSelector = document.createElement("select");
        this._tableSelector.setAttribute("name", "selectedTable");
        this._tableSelector.setAttribute("id", "tableSelector");

        /** @type {ColumnConstrainer[]} */
        this._columnConstrainers = [];

        /** @type {Orderer | null} */
        this._orderer = null;
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

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(/*css*/`
        ul {
            display: flex;
            justify-content: space-between;
        }
        li {
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
        } 
        `);
        this.shadow.adoptedStyleSheets = [sheet];
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
            this._operatorSelector = getSelect(ColumnConstraint._generalOperators, "operator");
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
