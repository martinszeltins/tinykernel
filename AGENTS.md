# General plan for our kernel. Very simple, yet all the main real kernel concepts.

1. **Machine**

   * CPU
   * Memory
   * Disk
   * Clock/timer

2. **Instruction Set**

   * Opcodes
   * Instruction pointer
   * Registers
   * Instruction execution

3. **Programs**

   * Program format
   * Program instructions
   * Program data

4. **Processes / Tasks**

   * Process ID
   * Process state
   * Registers
   * Memory
   * Program counter

5. **Process Table**

   * Kernel's collection of all processes

6. **Scheduler** (very basic scheduler)

   * Ready queue
   * Running process
   * Time slices
   * Context switching

7. **Memory Management**

   * Physical memory
   * Process memory regions
   * Allocation
   * Protection/isolation

8. **System Calls**

   * Interface from programs into the kernel
   * Process operations
   * Memory operations
   * File/device operations
   * IPC operations

9. **Interprocess Communication** (very basic IPC)

   * Messages
   * Send
   * Receive
   * Blocking/waiting

10. **Disk**

    * Raw disk blocks
    * Read blocks
    * Write blocks

11. **File System** (very basic file system)

    * Files
    * File names
    * File metadata
    * File contents
    * Open/read/write/close

12. **Devices / I/O** (we can keep it simple, maybe we don't need this)

    * Simple console/output device
    * Input device
    * Device abstraction

13. **Interrupts / Events** (maybe not needed)

    * Timer interrupt
    * I/O completion
    * Wake sleeping processes

14. **Process Lifecycle** (maybe not needed)

    * Create
    * Ready
    * Run
    * Block
    * Wake
    * Exit

15. **Kernel Main Loop**

    * Handle events
    * Schedule processes
    * Execute processes
    * Handle system calls
    * Repeat

