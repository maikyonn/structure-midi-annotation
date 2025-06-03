import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://bpxcdglwpcaoalcwovdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweGNkZ2x3cGNhb2FsY3dvdmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTkzNzcsImV4cCI6MjA2NDMzNTM3N30.c9_TVBp_aikmjfpjBA8oihy_3H6krERLPT1Vd1mC_tI'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// MIDI data functions
export class MidiDataService {
  // Load all MIDI files data
  static async loadMidiFiles() {
    try {
      const { data, error } = await supabase
        .from('midi_files')
        .select('*')
        .order('file_id', { ascending: true })
      
      if (error) {
        console.error('Error loading MIDI files:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('Failed to load MIDI files:', error)
      throw error
    }
  }
  
  // Save annotation for a MIDI file
  static async saveAnnotation(fileId, humanAgree) {
    try {
      const { data, error } = await supabase
        .from('midi_files')
        .update({ human_agree: humanAgree })
        .eq('file_id', fileId)
        .select()
      
      if (error) {
        console.error('Error saving annotation:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Failed to save annotation:', error)
      throw error
    }
  }
  
  // Get unannotated files count
  static async getUnannotatedCount() {
    try {
      const { count, error } = await supabase
        .from('midi_files')
        .select('*', { count: 'exact', head: true })
        .is('human_agree', null)
      
      if (error) {
        console.error('Error counting unannotated files:', error)
        throw error
      }
      
      return count || 0
    } catch (error) {
      console.error('Failed to count unannotated files:', error)
      throw error
    }
  }
  
  // Get next unannotated file
  static async getNextUnannotated(currentFileId = null) {
    try {
      let query = supabase
        .from('midi_files')
        .select('*')
        .is('human_agree', null)
        .order('file_id', { ascending: true })
        .limit(1)
      
      // If we have a current file, get the next one after it
      if (currentFileId) {
        query = query.gt('file_id', currentFileId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error getting next unannotated file:', error)
        throw error
      }
      
      // If no file found after current, get the first unannotated file
      if (!data || data.length === 0) {
        const { data: firstData, error: firstError } = await supabase
          .from('midi_files')
          .select('*')
          .is('human_agree', null)
          .order('file_id', { ascending: true })
          .limit(1)
        
        if (firstError) {
          console.error('Error getting first unannotated file:', firstError)
          throw firstError
        }
        
        return firstData && firstData.length > 0 ? firstData[0] : null
      }
      
      return data[0]
    } catch (error) {
      console.error('Failed to get next unannotated file:', error)
      throw error
    }
  }
}

export default supabase