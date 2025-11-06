import {Relation, QueryBuilder, ColumnConstraint, ColumnConstrainer, Orderer} from "./components.js";


customElements.define("db-relation", Relation);
customElements.define("db-query-builder", QueryBuilder);
customElements.define("db-field-constraint", ColumnConstraint);
customElements.define("db-field-constrainer", ColumnConstrainer);
customElements.define("db-orderer", Orderer);


const queryBuilder = document.getElementById("query-builder");
const relation = document.getElementById("relation");


document.getElementById("search").addEventListener("click", _ => {
    relation.query = queryBuilder.query;
});