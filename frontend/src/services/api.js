/* CBIT Sports - Mock Service Layer */

// Helper to generate UUIDs
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const DEFAULT_STUDENTS = [
  {
    roll_no: "160120733",
    name: "Ananya Sharma",
    gender: "FEMALE",
    branch: "CSE",
    year: 3,
    eligible: true,
    active_checkouts: 0,
    eligible_sports: ["basketball", "cricket_kit", "tt_set", "volleyball", "carrom_board", "football"]
  },
  {
    roll_no: "160120734",
    name: "Vikram Singh",
    gender: "MALE",
    branch: "ECE",
    year: 4,
    eligible: false,
    reason: "Max active checkouts (2) reached",
    active_checkouts: 2,
    eligible_sports: []
  },
  {
    roll_no: "160120735",
    name: "Kabir Reddy",
    gender: "MALE",
    branch: "CIVIL",
    year: 2,
    eligible: true,
    active_checkouts: 0,
    eligible_sports: ["basketball", "cricket_kit", "tt_set", "volleyball", "carrom_board", "football"]
  }
];

const DEFAULT_EQUIPMENT = [
  {
    id: "basketball",
    name: "Basketball",
    sport: "Basketball",
    total_stock: 20,
    available_stock: 12,
    low_stock_threshold: 5,
    gender_rule: "ALL",
    max_issue_cap: 1,
    variants: [
      { id: "bball_sz_7", name: "Size 7 (Standard)", available_stock: 8 },
      { id: "bball_sz_6", name: "Size 6 (Women's)", available_stock: 4 }
    ]
  },
  {
    id: "cricket_kit",
    name: "Cricket Kit",
    sport: "Cricket",
    total_stock: 5,
    available_stock: 2,
    low_stock_threshold: 3,
    gender_rule: "ALL",
    max_issue_cap: 1,
    variants: [
      { id: "cricket_bat", name: "Bat & Balls", available_stock: 2 }
    ]
  },
  {
    id: "tt_set",
    name: "Table Tennis Set",
    sport: "Table Tennis",
    total_stock: 30,
    available_stock: 24,
    low_stock_threshold: 6,
    gender_rule: "ALL",
    max_issue_cap: 2,
    variants: [
      { id: "tt_bat", name: "Bat", available_stock: 16 },
      { id: "tt_ball", name: "Ball", available_stock: 8 }
    ]
  },
  {
    id: "volleyball",
    name: "Volleyball",
    sport: "Volleyball",
    total_stock: 10,
    available_stock: 9,
    low_stock_threshold: 3,
    gender_rule: "ALL",
    max_issue_cap: 1,
    variants: [
      { id: "vball_std", name: "Standard", available_stock: 9 }
    ]
  },
  {
    id: "carrom_board",
    name: "Carrom Board",
    sport: "Carrom",
    total_stock: 8,
    available_stock: 6,
    low_stock_threshold: 2,
    gender_rule: "ALL",
    max_issue_cap: 1,
    variants: [
      { id: "carrom_std", name: "Board & Coins", available_stock: 6 }
    ]
  },
  {
    id: "football",
    name: "Football",
    sport: "Football",
    total_stock: 6,
    available_stock: 0,
    low_stock_threshold: 2,
    gender_rule: "ALL",
    max_issue_cap: 1,
    variants: [
      { id: "fball_std", name: "Standard", available_stock: 0 }
    ]
  }
];

const DEFAULT_TRANSACTIONS = [
  // Vikram's active checkouts
  {
    id: "tx-init-1",
    client_tx_id: "tx-client-init-1",
    roll_no: "160120734",
    equipment_id: "basketball",
    variant_id: "bball_sz_7",
    operator_id: "operator1",
    checked_out_at: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    returned_at: null,
    checkout_reason: "Practice",
    status: "ISSUED"
  },
  {
    id: "tx-init-2",
    client_tx_id: "tx-client-init-2",
    roll_no: "160120734",
    equipment_id: "cricket_kit",
    variant_id: "cricket_bat",
    operator_id: "operator1",
    checked_out_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    returned_at: null,
    checkout_reason: "Free Hour",
    status: "ISSUED"
  }
];

class MockDatabase {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem("cbit_students")) {
      localStorage.setItem("cbit_students", JSON.stringify(DEFAULT_STUDENTS));
    }
    if (!localStorage.getItem("cbit_equipment")) {
      localStorage.setItem("cbit_equipment", JSON.stringify(DEFAULT_EQUIPMENT));
    }
    if (!localStorage.getItem("cbit_transactions")) {
      localStorage.setItem("cbit_transactions", JSON.stringify(DEFAULT_TRANSACTIONS));
    }
    if (!localStorage.getItem("cbit_processed_client_txs")) {
      localStorage.setItem("cbit_processed_client_txs", JSON.stringify(["tx-client-init-1", "tx-client-init-2"]));
    }
  }

  getStudents() {
    return JSON.parse(localStorage.getItem("cbit_students"));
  }

  saveStudents(students) {
    localStorage.setItem("cbit_students", JSON.stringify(students));
  }

  getEquipment() {
    return JSON.parse(localStorage.getItem("cbit_equipment"));
  }

  saveEquipment(equipment) {
    localStorage.setItem("cbit_equipment", JSON.stringify(equipment));
  }

  getTransactions() {
    return JSON.parse(localStorage.getItem("cbit_transactions"));
  }

  saveTransactions(transactions) {
    localStorage.setItem("cbit_transactions", JSON.stringify(transactions));
  }

  getProcessedClientTxs() {
    return JSON.parse(localStorage.getItem("cbit_processed_client_txs"));
  }

  saveProcessedClientTxs(txs) {
    localStorage.setItem("cbit_processed_client_txs", JSON.stringify(txs));
  }

  reset() {
    localStorage.removeItem("cbit_students");
    localStorage.removeItem("cbit_equipment");
    localStorage.removeItem("cbit_transactions");
    localStorage.removeItem("cbit_processed_client_txs");
    this.init();
  }
}

export const db = new MockDatabase();

// Simulated network latency wrapper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  // Authentication API
  async login(username, password) {
    await delay(600);
    if ((username === "operator1" || username === "operator") && password === "password") {
      return {
        token: "mock-jwt-operator-token-xyz",
        role: "operator",
        name: "Rohan Verma",
        location: "Counter 1"
      };
    } else if ((username === "manager" || username === "admin") && password === "password") {
      return {
        token: "mock-jwt-manager-token-abc",
        role: "manager",
        name: "S. Rao",
        location: "Central Sports Office"
      };
    } else {
      throw new Error("Invalid credentials");
    }
  },

  // Student details and eligibility API
  async getStudent(rollNo) {
    await delay(400);
    const students = db.getStudents();
    const student = students.find(s => s.roll_no === rollNo);
    
    if (!student) {
      const err = new Error("Student not found");
      err.code = "STUDENT_NOT_FOUND";
      throw err;
    }

    // Dynamic calculations of active checkouts
    const transactions = db.getTransactions();
    const activeCheckouts = transactions.filter(tx => tx.roll_no === rollNo && tx.status === "ISSUED");
    
    const maxAllowedCheckouts = 2;
    const isEligible = activeCheckouts.length < maxAllowedCheckouts;
    const reason = isEligible ? undefined : `Max active checkouts (${maxAllowedCheckouts}) reached`;

    return {
      roll_no: student.roll_no,
      name: student.name,
      gender: student.gender,
      branch: student.branch,
      year: student.year,
      eligible: isEligible,
      reason: reason,
      active_checkouts: activeCheckouts.length,
      eligible_sports: isEligible ? student.eligible_sports : []
    };
  },

  // Progressive student enrollment API
  async enrollStudent(studentData) {
    await delay(700);
    const students = db.getStudents();
    
    if (students.some(s => s.roll_no === studentData.roll_no)) {
      throw new Error("Student already exists with this Roll Number");
    }

    const newStudent = {
      ...studentData,
      eligible: true,
      active_checkouts: 0,
      eligible_sports: ["basketball", "cricket_kit", "tt_set", "volleyball", "carrom_board", "football"]
    };

    students.push(newStudent);
    db.saveStudents(students);

    return {
      status: "success",
      student: newStudent
    };
  },

  // Inventory catalog API
  async getEquipment() {
    await delay(300);
    return db.getEquipment();
  },

  // Restock API
  async restockEquipment(equipmentId, variantId, quantity) {
    await delay(500);
    const equipment = db.getEquipment();
    const item = equipment.find(e => e.id === equipmentId);
    
    if (!item) throw new Error("Equipment not found");

    const variant = item.variants.find(v => v.id === variantId);
    if (!variant) throw new Error("Variant not found");

    variant.available_stock += quantity;
    item.available_stock += quantity;

    db.saveEquipment(equipment);

    // Trigger local SSE emulation callback
    if (window.onSSERecieveAlert) {
      window.onSSERecieveAlert({
        event: "activity",
        data: {
          timestamp: new Date().toISOString(),
          student_name: "ADMINISTRATOR",
          action: "restocked",
          equipment_name: item.name,
          variant_name: variant.name,
          sport: item.sport
        }
      });
    }

    return {
      status: "success",
      new_available_stock: item.available_stock,
      variant_stock: variant.available_stock
    };
  },

  // Issue Equipment API
  async issueEquipment(issueData) {
    await delay(500);
    const { client_tx_id, roll_no, equipment_id, variant_id, operator_id, checkout_reason } = issueData;
    
    // 1. Idempotency Check
    const processedTxs = db.getProcessedClientTxs();
    if (processedTxs.includes(client_tx_id)) {
      return {
        status: "skipped_duplicate",
        client_tx_id
      };
    }

    // 2. Validate student eligibility
    const student = await this.getStudent(roll_no);
    if (!student.eligible) {
      throw new Error(student.reason || "Student is not eligible for checkout");
    }

    // 3. Update Inventory Stock
    const equipment = db.getEquipment();
    const item = equipment.find(e => e.id === equipment_id);
    if (!item) throw new Error("Equipment not found");
    if (item.available_stock <= 0) throw new Error("Equipment is out of stock");

    const variant = item.variants.find(v => v.id === variant_id);
    if (!variant) throw new Error("Variant not found");
    if (variant.available_stock <= 0) throw new Error("Variant is out of stock");

    // Decrement stock
    variant.available_stock -= 1;
    item.available_stock -= 1;
    db.saveEquipment(equipment);

    // 4. Create Transaction
    const transactions = db.getTransactions();
    const transactionId = generateUUID();
    const newTx = {
      id: transactionId,
      client_tx_id,
      roll_no,
      equipment_id,
      variant_id,
      operator_id,
      checked_out_at: new Date().toISOString(),
      returned_at: null,
      checkout_reason,
      status: "ISSUED"
    };
    transactions.push(newTx);
    db.saveTransactions(transactions);

    // Add to processed list
    processedTxs.push(client_tx_id);
    db.saveProcessedClientTxs(processedTxs);

    // 5. Emit Emulated Real-time SSE Events
    this._emitSSEActivity(student.name, "issued", item.name, variant.name, item.sport);
    if (item.available_stock <= item.low_stock_threshold) {
      this._emitSSELowStock(item.id, item.name, variant.id, variant.name, item.available_stock, item.low_stock_threshold);
    }

    return {
      status: "success",
      transaction_id: transactionId,
      client_tx_id,
      available_stock: item.available_stock
    };
  },

  // Return Equipment API
  async returnEquipment(returnData) {
    await delay(500);
    const { roll_no, equipment_id, variant_id } = returnData;
    
    // Find active checkout
    const transactions = db.getTransactions();
    const activeTx = transactions.find(
      tx => tx.roll_no === roll_no && 
            tx.equipment_id === equipment_id && 
            tx.variant_id === variant_id && 
            tx.status === "ISSUED"
    );

    if (!activeTx) {
      throw new Error("No active checkout found for this student and equipment");
    }

    // Update transaction
    activeTx.status = "RETURNED";
    activeTx.returned_at = new Date().toISOString();
    db.saveTransactions(transactions);

    // Update inventory
    const equipment = db.getEquipment();
    const item = equipment.find(e => e.id === equipment_id);
    if (item) {
      item.available_stock += 1;
      const variant = item.variants.find(v => v.id === variant_id);
      if (variant) {
        variant.available_stock += 1;
      }
      db.saveEquipment(equipment);
    }

    // Emit emulated SSE returning event
    const students = db.getStudents();
    const student = students.find(s => s.roll_no === roll_no);
    const studentName = student ? student.name : "Student";
    
    this._emitSSEActivity(studentName, "returned", item.name, item.variants.find(v => v.id === variant_id).name, item.sport);

    return {
      status: "success",
      message: "Equipment returned successfully",
      available_stock: item ? item.available_stock : 0
    };
  },

  // Bulk synchronization API
  async syncTransactions(syncData) {
    await delay(1200);
    const { transactions } = syncData;
    const results = [];
    let syncedCount = 0;

    for (const tx of transactions) {
      try {
        const response = await this.issueEquipment(tx);
        if (response.status === "success") {
          syncedCount++;
          results.push({ client_tx_id: tx.client_tx_id, status: "processed" });
        } else {
          results.push({ client_tx_id: tx.client_tx_id, status: "skipped_duplicate" });
        }
      } catch (err) {
        results.push({ client_tx_id: tx.client_tx_id, status: "failed", error: err.message });
      }
    }

    return {
      status: "success",
      synced_count: syncedCount,
      results
    };
  },

  // Rule Editor Save API
  async updateEquipmentRules(rules) {
    await delay(600);
    const equipment = db.getEquipment();
    const item = equipment.find(e => e.id === rules.id);
    if (!item) throw new Error("Equipment not found");

    item.gender_rule = rules.gender_rule;
    item.low_stock_threshold = parseInt(rules.low_stock_threshold);
    item.max_issue_cap = parseInt(rules.max_issue_cap);
    db.saveEquipment(equipment);

    return { status: "success" };
  },

  // Flag/Override API
  async relinkCard(oldRoll, newRoll) {
    await delay(500);
    const students = db.getStudents();
    const idx = students.findIndex(s => s.roll_no === oldRoll);
    if (idx === -1) throw new Error("Original student card not found");

    // Relink roll number in student registry and all transactions
    const originalRoll = students[idx].roll_no;
    students[idx].roll_no = newRoll;
    db.saveStudents(students);

    const transactions = db.getTransactions();
    transactions.forEach(tx => {
      if (tx.roll_no === originalRoll) {
        tx.roll_no = newRoll;
      }
    });
    db.saveTransactions(transactions);

    return { status: "success" };
  },

  // Helper emitters to simulate SSE
  _emitSSEActivity(student_name, action, equipment_name, variant_name, sport) {
    if (window.onSSERecieveAlert) {
      window.onSSERecieveAlert({
        event: "activity",
        data: {
          timestamp: new Date().toISOString(),
          student_name,
          action,
          equipment_name,
          variant_name,
          sport
        }
      });
    }
  },

  _emitSSELowStock(equipment_id, equipment_name, variant_id, variant_name, available_stock, threshold) {
    if (window.onSSERecieveAlert) {
      window.onSSERecieveAlert({
        event: "low_stock",
        data: {
          equipment_id,
          equipment_name,
          variant_id,
          variant_name,
          available_stock,
          threshold
        }
      });
    }
  },

  // SSE client-connection subscription mock
  subscribeToLiveStream(onMessage) {
    window.onSSERecieveAlert = (eventObj) => {
      onMessage(eventObj);
    };

    // Periodically generate simulated background transactions from other counters!
    const interval = setInterval(() => {
      const names = ["Rohan Roy", "Karan Johar", "Rahul Dravid", "Preeti Zinta", "Suresh Raina", "Virat Kohli"];
      const sports = [
        { name: "Basketball", variant: "Size 7 (Standard)", sport: "Basketball", id: "basketball" },
        { name: "Cricket Kit", variant: "Bat & Balls", sport: "Cricket", id: "cricket_kit" },
        { name: "Table Tennis Set", variant: "Bat", sport: "Table Tennis", id: "tt_set" },
        { name: "Volleyball", variant: "Standard", sport: "Volleyball", id: "volleyball" }
      ];

      const name = names[Math.floor(Math.random() * names.length)];
      const item = sports[Math.floor(Math.random() * sports.length)];
      const action = Math.random() > 0.35 ? "issued" : "returned";

      // Trigger SSE event
      onMessage({
        event: "activity",
        data: {
          timestamp: new Date().toISOString(),
          student_name: name,
          action: action,
          equipment_name: item.name,
          variant_name: item.variant,
          sport: item.sport
        }
      });

      // Periodically trigger a low stock alert
      if (Math.random() > 0.75) {
        onMessage({
          event: "low_stock",
          data: {
            equipment_id: item.id,
            equipment_name: item.name,
            variant_id: "variant_rand",
            variant_name: item.variant,
            available_stock: Math.floor(Math.random() * 3),
            threshold: 4
          }
        });
      }
    }, 15000); // every 15 seconds, mock activity

    return () => {
      clearInterval(interval);
      window.onSSERecieveAlert = null;
    };
  }
};
