import { fetchQueryResult, fetchTableList } from "./db_api.js";
export {Relation, QueryBuilder, ColumnConstraint, ColumnConstrainer}; 

class Relation extends HTMLElement {
    constructor() {
        super();
        this.style.display = "block";
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
        const relation = document.createElement("div");
        this.shadow.innerHTML = ``;
        this.shadow.appendChild(relation)

        if (this._query === null) {
            relation.appendChild(getRelationHeader([]));
            return;
        }

        const res = await fetchQueryResult(this.query);

        const columnNames = this.query.columns && this.query.columns.length != 0
            ? this.query.column
            : (await fetchTableList()).rows.find(row => row.table_name === this.query.table).columns.map(c => c.name);
        relation.appendChild(getRelationHeader(columnNames));
        const rowData = res.rows.map(row => columnNames.map(column => row[column]));
        rowData.forEach(row => relation.appendChild(getRow(row)));
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
        this.render();
    }

    render() {
        if (this._tables === null) {
            console.error("Invalid state");
            return;
        }

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
        
        const div = document.createElement("div");
        this.shadow.replaceChildren(div);

        div.appendChild(this._tableSelector);

        const constraintDiv = document.createElement("div");
        div.appendChild(constraintDiv);


        this._tableSelector.addEventListener("change", _ => {
            if (this.table == "") {
                return;
            }
            const columnToTypeMap = this._tables[this.table];
            const dl = document.createElement("dl");
            this._columnConstrainers = [];
            for (const key in columnToTypeMap) {
                const ccner = new ColumnConstrainer(key, columnToTypeMap[key]);
                this._columnConstrainers.push(ccner);
                const dt = document.createElement("dt");
                dt.innerText = key;
                dl.appendChild(dt);
                const dd = document.createElement("dd");
                dd.appendChild(ccner);

                dl.appendChild(dd);
            }
            constraintDiv.replaceChildren(dl);
        });
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

function getRow(data) {
    const div = document.createElement("div")
    div.innerHTML = /*html*/`
    <style>
        :host {
            display:block;
        }
        ul {
            display: flex;
            padding: 10px;
            border: 1px solid #ccc;
            background-color: #fff;
            justify-content: space-evenly;
            list-style-type: none;
            margin: 0.5em;
        }

        ul:hover {
            background-color: #f7f7f7;
        }

        li {
            padding: 0 10px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            flex: 1;
        }
    </style>
    <ul>
        ${data.map(item => `<li>${item}</li>`).join('')}
    </ul>`;
    return div;
}

function getRelationHeader(columns) {
    const div = document.createElement("div");
    div.innerHTML = /*html*/`
    <style>
        :host {
            display:block;
        }
        ul {
            display: flex;
            padding: 10px;
            border: 1px solid #ccc;
            background-color: #f0f0f0;
            justify-content: space-evenly;
            list-style-type: none;
        }

        li {
            padding: 0 10px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            flex: 1;
            text-align:left;
        }
    </style>
    <ul>${columns.map(item => /*html*/`
        <li>${item}</li>
    `).join('')}</ul>
    `;
    return div;
}

